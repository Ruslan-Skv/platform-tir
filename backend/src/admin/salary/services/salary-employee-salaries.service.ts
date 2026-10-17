import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { WorkDayJournalService } from '../../work-days/services/work-day-journal.service';
import { round2, toDateIso, toNum } from '../salary.constants';

/** Строка справочника окладов с данными сотрудника. */
type EmployeeSalaryRow = {
  userId: string;
  monthlySalary: Prisma.Decimal;
  user: { lastName: string | null; firstName: string | null };
};

/** Расшифровка одного удержания из оклада: за что, когда и на какую сумму. */
export type SalaryDeduction = {
  /** Дата события (YYYY-MM-DD). */
  date: string;
  /** Опоздание / ранний уход / автозакрытие дня / прогул. */
  kind: 'LATE' | 'EARLY_LEAVE' | 'AUTO_CLOSE' | 'TRUANCY';
  /** На сколько минут (для опоздания и раннего ухода, уже за вычетом льготных 10 минут). */
  minutes: number | null;
  amount: number;
};

/** Оклад сотрудника за период: начисление по дням и удержания за нарушения режима. */
export type SalaryEmployeePayout = {
  userId: string;
  userName: string | null;
  monthlySalary: number;
  days: number;
  violationsCount: number;
  penalty: number;
  autoCloseCount: number;
  autoClosePenalty: number;
  truancyDays: number;
  truancyDeduction: number;
  /** Расшифровка удержаний по событиям (дата, основание, сумма). */
  deductions: SalaryDeduction[];
  amount: number;
};

/**
 * Оклады сотрудников за период расчёта з/п:
 *  - за каждый день периода начисляется 1/N оклада (N — дней в месяце этого дня);
 *    будущие дни не начисляются — оклад считается по сегодняшний день включительно;
 *  - при включённом контроле режима — удержание за каждое опоздание/ранний уход;
 *  - при включённом учёте автозакрытий — удержание за каждый рабочий день,
 *    закрытый автоматически по истечении срока;
 *  - при включённом учёте прогулов — удержание дневной доли за каждый прогул
 *    (прошедший рабочий день по графику без явки и без согласованного выходного).
 */
@Injectable()
export class SalaryEmployeeSalariesService {
  constructor(
    private prisma: PrismaService,
    private workDayJournal: WorkDayJournalService,
  ) {}

  async calculate(input: {
    from: Date;
    to: Date;
    todayUtc: number;
    workModeEnforced: boolean;
    /** Удержание из оклада за каждое опоздание/ранний уход, ₽ (из настроек). */
    workModePenaltyRub: number;
    autoCloseEnforced: boolean;
    /** Удержание из оклада за каждое автозакрытие рабочего дня, ₽ (из настроек). */
    autoClosePenaltyRub: number;
    truancyEnforced: boolean;
    employeeSalaries: EmployeeSalaryRow[];
  }): Promise<{ salaries: SalaryEmployeePayout[]; salariesTotal: number }> {
    const { from, to, todayUtc, employeeSalaries } = input;

    // Контроль режима работы: за каждое опоздание/убытие раньше графика удерживается
    // сумма из настроек (lateMinutes/earlyLeaveMinutes уже учитывают льготные 10 минут
    // и согласованные заявки). Считается только по дням, вошедшим в начисление
    // оклада (не позже сегодняшнего дня).
    const workModePenalties = new Map<string, number>();
    const workModeEvents = new Map<
      string,
      Array<{ date: string; kind: 'LATE' | 'EARLY_LEAVE'; minutes: number }>
    >();
    if (input.workModeEnforced && employeeSalaries.length > 0) {
      const penaltyUntil = new Date(
        Math.min(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()), todayUtc),
      );
      const violations = await this.prisma.workDay.findMany({
        where: {
          userId: { in: employeeSalaries.map((s) => s.userId) },
          workDate: { gte: from, lte: penaltyUntil },
          OR: [{ lateMinutes: { gt: 0 } }, { earlyLeaveMinutes: { gt: 0 } }],
        },
        select: { userId: true, workDate: true, lateMinutes: true, earlyLeaveMinutes: true },
      });
      for (const v of violations) {
        const events = workModeEvents.get(v.userId) ?? [];
        const date = toDateIso(v.workDate);
        if (date) {
          if (v.lateMinutes > 0) events.push({ date, kind: 'LATE', minutes: v.lateMinutes });
          if (v.earlyLeaveMinutes > 0)
            events.push({ date, kind: 'EARLY_LEAVE', minutes: v.earlyLeaveMinutes });
        }
        const count = (v.lateMinutes > 0 ? 1 : 0) + (v.earlyLeaveMinutes > 0 ? 1 : 0);
        workModePenalties.set(v.userId, (workModePenalties.get(v.userId) ?? 0) + count);
        workModeEvents.set(v.userId, events);
      }
    }

    // Учёт автозакрытий: за каждый рабочий день, закрытый автоматически
    // по истечении срока (сотрудник не закрыл день сам), удерживается сумма
    // из настроек. Как и контроль режима, считается только по дням,
    // вошедшим в начисление оклада (не позже сегодняшнего дня).
    const autoCloseCounts = new Map<string, number>();
    const autoCloseDates = new Map<string, string[]>();
    if (input.autoCloseEnforced && employeeSalaries.length > 0) {
      const penaltyUntil = new Date(
        Math.min(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()), todayUtc),
      );
      const autoClosed = await this.prisma.workDay.findMany({
        where: {
          userId: { in: employeeSalaries.map((s) => s.userId) },
          workDate: { gte: from, lte: penaltyUntil },
          status: 'AUTO_CLOSED',
        },
        select: { userId: true, workDate: true },
      });
      for (const day of autoClosed) {
        autoCloseCounts.set(day.userId, (autoCloseCounts.get(day.userId) ?? 0) + 1);
        const dates = autoCloseDates.get(day.userId) ?? [];
        const iso = toDateIso(day.workDate);
        if (iso) dates.push(iso);
        autoCloseDates.set(day.userId, dates);
      }
    }

    // Учёт прогулов: за каждый прогул (прошедший рабочий день по графику без явки
    // и без согласованного выходного/отпуска — как в журнале рабочих дней)
    // из оклада удерживается дневная доля (оклад / дней в месяце этого дня).
    const truancyByUser = new Map<string, Date[]>();
    if (input.truancyEnforced && employeeSalaries.length > 0) {
      const salaryUserIds = new Set(employeeSalaries.map((s) => s.userId));
      // Существующие записи рабочих дней обязательны: без них журнал сочтёт
      // прогулом каждый рабочий день по графику.
      const records = await this.prisma.workDay.findMany({
        where: { userId: { in: [...salaryUserIds] }, workDate: { gte: from, lte: to } },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
          office: { select: { id: true, name: true } },
          absences: { orderBy: { startedAt: 'asc' } },
        },
      });
      const journalRows = await this.workDayJournal.attachRequests(records, {
        dateFrom: toDateIso(from) ?? undefined,
        dateTo: toDateIso(to) ?? undefined,
      });
      for (const row of journalRows) {
        if (row.truancyOnly !== true) continue;
        if (!salaryUserIds.has(row.userId)) continue;
        const workDate = new Date(
          Date.UTC(
            row.workDate.getUTCFullYear(),
            row.workDate.getUTCMonth(),
            row.workDate.getUTCDate(),
          ),
        );
        // Прогул уменьшает только уже начисленную часть оклада (не будущие дни).
        if (workDate.getTime() > todayUtc) continue;
        const list = truancyByUser.get(row.userId) ?? [];
        list.push(workDate);
        truancyByUser.set(row.userId, list);
      }
    }

    const salaries = employeeSalaries.map((s): SalaryEmployeePayout => {
      const monthlySalary = toNum(s.monthlySalary);
      let amount = 0;
      let days = 0;
      const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
      const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
      const daySalary = (d: Date) => {
        const daysInMonth = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
        ).getUTCDate();
        return monthlySalary / daysInMonth;
      };
      while (day.getTime() <= end.getTime()) {
        if (day.getTime() > todayUtc) break;
        amount += daySalary(day);
        days += 1;
        day.setUTCDate(day.getUTCDate() + 1);
      }
      const violationsCount = workModePenalties.get(s.userId) ?? 0;
      const penalty = round2(violationsCount * input.workModePenaltyRub);
      const autoCloseCount = autoCloseCounts.get(s.userId) ?? 0;
      const autoClosePenalty = round2(autoCloseCount * input.autoClosePenaltyRub);
      const truancyDays = truancyByUser.get(s.userId) ?? [];
      const truancyDeduction = round2(truancyDays.reduce((sum, d) => sum + daySalary(d), 0));
      // Расшифровка удержаний по событиям — в хронологическом порядке.
      const deductions: SalaryDeduction[] = [
        ...(workModeEvents.get(s.userId) ?? []).map((e) => ({
          date: e.date,
          kind: e.kind,
          minutes: e.minutes,
          amount: round2(input.workModePenaltyRub),
        })),
        ...(autoCloseDates.get(s.userId) ?? []).map((date) => ({
          date,
          kind: 'AUTO_CLOSE' as const,
          minutes: null,
          amount: round2(input.autoClosePenaltyRub),
        })),
        ...truancyDays.map((d) => ({
          date: toDateIso(d) ?? '',
          kind: 'TRUANCY' as const,
          minutes: null,
          amount: round2(daySalary(d)),
        })),
      ]
        .filter((d) => d.date !== '')
        .sort((a, b) => a.date.localeCompare(b.date));
      return {
        userId: s.userId,
        userName: [s.user.lastName, s.user.firstName].filter(Boolean).join(' ').trim() || null,
        monthlySalary,
        days,
        violationsCount,
        penalty,
        autoCloseCount,
        autoClosePenalty,
        truancyDays: truancyDays.length,
        truancyDeduction,
        deductions,
        amount: round2(Math.max(0, amount - penalty - autoClosePenalty - truancyDeduction)),
      };
    });
    return { salaries, salariesTotal: round2(salaries.reduce((sum, s) => sum + s.amount, 0)) };
  }
}
