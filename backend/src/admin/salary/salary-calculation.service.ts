import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { WorkDayJournalService } from '../work-days/services/work-day-journal.service';
import { DP_MANUAL_DIRECTION_OTHER } from '../../common/config/package-direction-registry.config';
import { fromDateIso, round2, toDateIso, toNum } from './salary.constants';

/** Удержание за нарушение режима работы (опоздание / ранний уход), ₽. */
const SALARY_WORK_MODE_PENALTY_RUB = 50;

/**
 * Расчёт з/п за период — перенос логики Google-таблицы «Новая таблица 2025».
 *
 * Модель расчёта по договору (аналог листов «19о», «19-50/50» и т.п.):
 *  - стоимость договора = ст-ть изделий + ст-ть монтажа (для «о»-направлений) или стоимость
 *    договора (ремонт);
 *  - з/п менеджера = стоимость × %мен × доля_при_заключении (если дата заключения в периоде)
 *                  + стоимость × %мен × доля_при_закрытии (если дата закрытия в периоде)
 *                  + Σ(доп.согл. × %мен) за доп. соглашения с датой в периоде;
 *  - замерщик = з/п менеджера × %зам / %мен (пропорционально своей ставке);
 *    если замерщика у договора нет — з/п за замер не считается и никому не переходит;
 *  - ВС (ведущий специалист) = з/п менеджера × %ВС / %мен — фонд по направлению;
 *  - бригадир = з/п менеджера × %бриг / %мен (ремонтные направления, обычно 8.5%)
 *    и получает только свой фонд (общий пул упразднён);
 *  - налог из настроек удерживается из всех фондов, кроме з/п менеджеров:
 *    менеджеры получают начисления по своей ставке целиком.
 */
@Injectable()
export class SalaryCalculationService {
  constructor(
    private prisma: PrismaService,
    private workDayJournal: WorkDayJournalService,
  ) {}

  async calculate(input: {
    dateFrom: string;
    dateTo: string;
    officeId?: string;
    employeeId?: string;
  }) {
    const from = fromDateIso(input.dateFrom);
    const to = fromDateIso(input.dateTo);
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('Начало периода не может быть позже конца');
    }

    const [globalSetting, categories, rateRules, employeeSalaries, contracts] = await Promise.all([
      this.prisma.salaryGlobalSetting.findUnique({
        where: { id: 'singleton' },
        include: { brigadier: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.salaryCategory.findMany({
        include: { leadSpecialist: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.salaryRateRule.findMany({ where: { isActive: true } }),
      this.prisma.salaryEmployeeSalary.findMany({
        where: {
          monthlySalary: { gt: 0 },
          ...(input.employeeId ? { userId: input.employeeId } : {}),
        },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.salaryContract.findMany({
        where: {
          officeId: input.officeId,
          AND: [
            {
              OR: [
                { signedAt: { gte: from, lte: to } },
                { closedAt: { gte: from, lte: to } },
                { extraBills: { some: { date: { gte: from, lte: to } } } },
              ],
            },
            // Фильтр по сотруднику — договоры, где он менеджер, замерщик или ведущий
            // специалист направления (как «Менеджер» в ДП).
            ...(input.employeeId
              ? [
                  {
                    OR: [
                      { managerId: input.employeeId },
                      { surveyorId: input.employeeId },
                      { category: { leadSpecialistUserId: input.employeeId } },
                    ],
                  },
                ]
              : []),
          ],
        },
        include: {
          office: { select: { id: true, name: true } },
          category: true,
          manager: { select: { id: true, firstName: true, lastName: true } },
          surveyor: { select: { id: true, firstName: true, lastName: true } },
          extraBills: { orderBy: { date: 'asc' } },
        },
        orderBy: [{ signedAt: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const taxPercent = toNum(globalSetting?.taxPercent ?? 8);
    const netFactor = round2((1 - taxPercent / 100) * 10000) / 10000;

    const rulesByKey = new Map<string, number>();
    for (const rule of rateRules) {
      rulesByKey.set(
        `${rule.categoryId}|${rule.officeId ?? '*'}|${rule.role}`,
        toNum(rule.percent),
      );
    }

    const inPeriod = (d: Date | null | undefined) =>
      !!d && d.getTime() >= from.getTime() && d.getTime() <= to.getTime();

    const rows = contracts.map((contract) => {
      const category = contract.category;
      const resolvePercent = (
        role: 'MANAGER' | 'SURVEYOR' | 'LEAD_SPECIALIST' | 'BRIGADIER',
        override: Prisma.Decimal | null,
        categoryDefault: Prisma.Decimal,
      ): number => {
        if (override !== null && override !== undefined) return toNum(override);
        const byOffice = rulesByKey.get(`${category.id}|${contract.officeId}|${role}`);
        if (byOffice !== undefined) return byOffice;
        const common = rulesByKey.get(`${category.id}|*|${role}`);
        if (common !== undefined) return common;
        return toNum(categoryDefault);
      };

      const managerPercent = resolvePercent(
        'MANAGER',
        contract.managerPercentOverride,
        category.managerPercent,
      );
      const surveyorPercent = resolvePercent(
        'SURVEYOR',
        contract.surveyorPercentOverride,
        category.surveyorPercent,
      );
      const vsPercent = resolvePercent(
        'LEAD_SPECIALIST',
        contract.vsPercentOverride,
        category.vsPercent,
      );
      const brigadierPercent = resolvePercent(
        'BRIGADIER',
        contract.brigadierPercentOverride,
        category.brigadierPercent,
      );

      const splitSign = toNum(category.splitSign);
      const splitClose = toNum(category.splitClose);
      const base = toNum(contract.baseAmount);

      const signedIn = inPeriod(contract.signedAt);
      const closedIn = inPeriod(contract.closedAt);

      const signPart = signedIn ? base * (managerPercent / 100) * splitSign : 0;
      const closePart = closedIn ? base * (managerPercent / 100) * splitClose : 0;
      const extraBillsInPeriod = contract.extraBills.filter((b) => inPeriod(b.date));
      const extraBase = extraBillsInPeriod.reduce((sum, b) => sum + toNum(b.amount), 0);
      const extraPart = extraBase * (managerPercent / 100);

      const managerAmount = round2(signPart + closePart + extraPart);

      const managerName =
        contract.managerName ||
        [contract.manager?.lastName, contract.manager?.firstName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        null;
      const surveyorName =
        contract.surveyorName ||
        [contract.surveyor?.lastName, contract.surveyor?.firstName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        null;

      // Замерщик/ВС/бригадир — пропорционально ставке менеджера (как в таблице: зп × %свой / %мен).
      const scale = managerPercent > 0 ? 1 / (managerPercent / 100) : 0;
      // Нет замерщика (замера не было или он не указан) — з/п за замер не считается
      // и никому не переходит.
      const surveyorAmount =
        contract.surveyorHandled && surveyorName != null
          ? round2(managerAmount * scale * (surveyorPercent / 100))
          : 0;
      const vsAmount = round2(managerAmount * scale * (vsPercent / 100));
      const brigadierAmount = round2(managerAmount * scale * (brigadierPercent / 100));

      return {
        id: contract.id,
        officeId: contract.officeId,
        officeName: contract.office.name,
        categoryId: category.id,
        categoryCode: category.code,
        categoryName: category.name,
        number: contract.number,
        signedAt: toDateIso(contract.signedAt),
        closedAt: toDateIso(contract.closedAt),
        customerName: contract.customerName,
        managerId: contract.managerId,
        managerName,
        surveyorId: contract.surveyorId,
        surveyorName,
        managerHandled: contract.managerHandled,
        surveyorHandled: contract.surveyorHandled,
        baseAmount: base,
        extraBillsAmount: round2(extraBase),
        extraBills: extraBillsInPeriod.map((b) => ({
          date: toDateIso(b.date),
          amount: round2(toNum(b.amount)),
        })),
        percents: {
          manager: managerPercent,
          surveyor: surveyorPercent,
          vs: vsPercent,
          brigadier: brigadierPercent,
        },
        split: { sign: splitSign, close: splitClose },
        parts: { sign: round2(signPart), close: round2(closePart), extra: round2(extraPart) },
        managerAmount,
        surveyorAmount,
        vsAmount,
        brigadierAmount,
        signedInPeriod: signedIn,
        closedInPeriod: closedIn,
        totalAmount: round2(base + toNum(contractSum(contract))),
      };
    });

    // --- Оклады: за каждый день периода 1/N оклада (N — дней в месяце этого дня).
    // Будущие дни не начисляются: оклад считается по сегодняшний день включительно
    // и растёт с каждым днём до полной суммы к концу месяца. ---

    const today = new Date();
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    // Контроль режима работы: −50 ₽ за каждое опоздание/убытие раньше графика
    // (lateMinutes/earlyLeaveMinutes уже учитывают льготные 10 минут и
    // согласованные заявки). Считается только по дням, вошедшим в начисление
    // оклада (не позже сегодняшнего дня).
    const workModePenalties = new Map<string, number>();
    if (globalSetting?.workModeEnforced && employeeSalaries.length > 0) {
      const penaltyUntil = new Date(
        Math.min(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()), todayUtc),
      );
      const violations = await this.prisma.workDay.findMany({
        where: {
          userId: { in: employeeSalaries.map((s) => s.userId) },
          workDate: { gte: from, lte: penaltyUntil },
          OR: [{ lateMinutes: { gt: 0 } }, { earlyLeaveMinutes: { gt: 0 } }],
        },
        select: { userId: true, lateMinutes: true, earlyLeaveMinutes: true },
      });
      for (const v of violations) {
        const count = (v.lateMinutes > 0 ? 1 : 0) + (v.earlyLeaveMinutes > 0 ? 1 : 0);
        workModePenalties.set(v.userId, (workModePenalties.get(v.userId) ?? 0) + count);
      }
    }
    // Учёт прогулов: за каждый прогул (прошедший рабочий день по графику без явки
    // и без согласованного выходного/отпуска — как в журнале рабочих дней)
    // из оклада удерживается дневная доля (оклад / дней в месяце этого дня).
    const truancyByUser = new Map<string, Date[]>();
    if (globalSetting?.truancyEnforced && employeeSalaries.length > 0) {
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
    const salaries = employeeSalaries.map((s) => {
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
      const penalty = violationsCount * SALARY_WORK_MODE_PENALTY_RUB;
      const truancyDays = truancyByUser.get(s.userId) ?? [];
      const truancyDeduction = round2(truancyDays.reduce((sum, d) => sum + daySalary(d), 0));
      return {
        userId: s.userId,
        userName: [s.user.lastName, s.user.firstName].filter(Boolean).join(' ').trim() || null,
        monthlySalary,
        days,
        violationsCount,
        penalty,
        truancyDays: truancyDays.length,
        truancyDeduction,
        amount: round2(Math.max(0, amount - penalty - truancyDeduction)),
      };
    });
    const salariesTotal = round2(salaries.reduce((sum, s) => sum + s.amount, 0));

    // --- Премии за места по итогам продаж за завершённые месяцы (журнал ДП) ---
    // Участвуют только менеджеры из итогов продаж ДП, чья сумма за месяц не ниже
    // минимального уровня из настроек. Месяц учитывается, когда он полностью
    // завершился и входит в период расчёта.

    const bonusByPlace = [
      toNum(globalSetting?.salesBonusFirstPlace ?? 0),
      toNum(globalSetting?.salesBonusSecondPlace ?? 0),
      toNum(globalSetting?.salesBonusThirdPlace ?? 0),
    ];
    const bonusMinSales = toNum(globalSetting?.salesBonusMinSales ?? 0);
    const salesBonuses: Array<{
      userId: string;
      userName: string | null;
      month: string;
      place: number;
      salesAmount: number;
      amount: number;
    }> = [];
    const hasBonuses = bonusByPlace.some((b) => b > 0);
    if (hasBonuses) {
      // Первый день месяца периода → перебор месяцев до конца периода.
      const month = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
      const periodEnd = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
      while (month.getTime() <= periodEnd) {
        const monthStart = new Date(month);
        const monthEnd = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
        // Премия начисляется сразу после завершения месяца: текущий месяц не участвует.
        if (monthEnd.getTime() < todayUtc) {
          const monthSums = await this.prisma.moneyMovement.groupBy({
            by: ['managerId'],
            where: {
              deletedAt: null,
              managerId: { not: null },
              paymentDate: { gte: monthStart, lte: monthEnd },
              direction: { not: DP_MANUAL_DIRECTION_OTHER },
            },
            _sum: { amount: true },
          });
          const ranked = monthSums
            .map((row) => ({
              userId: row.managerId as string,
              salesAmount: toNum(row._sum.amount ?? 0),
            }))
            .filter((row) => row.salesAmount > 0 && row.salesAmount >= bonusMinSales)
            .sort((a, b) => b.salesAmount - a.salesAmount);
          const winners = ranked.slice(0, 3);
          const bonusUsers = winners.length
            ? await this.prisma.user.findMany({
                where: { id: { in: winners.map((w) => w.userId) } },
                select: { id: true, firstName: true, lastName: true },
              })
            : [];
          const nameById = new Map(
            bonusUsers.map((u) => [
              u.id,
              [u.lastName, u.firstName].filter(Boolean).join(' ').trim() || null,
            ]),
          );
          winners.forEach((winner, index) => {
            const amount = bonusByPlace[index] ?? 0;
            if (amount <= 0) return;
            if (input.employeeId && winner.userId !== input.employeeId) return;
            salesBonuses.push({
              userId: winner.userId,
              userName: nameById.get(winner.userId) ?? null,
              month: `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`,
              place: index + 1,
              salesAmount: round2(winner.salesAmount),
              amount: round2(amount),
            });
          });
        }
        month.setUTCMonth(month.getUTCMonth() + 1);
      }
    }
    const salesBonusesTotal = round2(salesBonuses.reduce((sum, b) => sum + b.amount, 0));

    // --- Премия за выполнение плана продаж: порог объёма продаж за месяц →
    // премия в % от з/п менеджера по договорам за этот месяц (без оклада
    // и других премий). Проценты порогов не суммируются — премия считается
    // по самому высокому достигнутому порогу. ---

    const planTiers = [
      {
        threshold: toNum(globalSetting?.salesPlanThreshold1 ?? 0),
        percent: toNum(globalSetting?.salesPlanPercent1 ?? 0),
      },
      {
        threshold: toNum(globalSetting?.salesPlanThreshold2 ?? 0),
        percent: toNum(globalSetting?.salesPlanPercent2 ?? 0),
      },
      {
        threshold: toNum(globalSetting?.salesPlanThreshold3 ?? 0),
        percent: toNum(globalSetting?.salesPlanPercent3 ?? 0),
      },
    ].filter((tier) => tier.threshold > 0 && tier.percent > 0);
    const salesPlanBonuses: Array<{
      userId: string;
      userName: string | null;
      month: string;
      salesAmount: number;
      reachedTiers: number;
      percent: number;
      baseAmount: number;
      amount: number;
    }> = [];
    if (planTiers.length > 0) {
      // З/п менеджеров по договорам в разрезе месяцев: доли при заключении/закрытии
      // и доп. соглашения относятся к месяцам своих дат.
      const monthKey = (iso: string | null) => (iso ? iso.slice(0, 7) : null);
      const managerPartsByMonth = new Map<string, number>();
      for (const row of rows) {
        if (!row.managerId) continue;
        const add = (iso: string | null, value: number) => {
          const key = monthKey(iso);
          if (!key || value === 0) return;
          const mapKey = `${row.managerId}|${key}`;
          managerPartsByMonth.set(mapKey, round2((managerPartsByMonth.get(mapKey) ?? 0) + value));
        };
        add(row.signedAt, row.parts.sign);
        add(row.closedAt, row.parts.close);
        for (const bill of row.extraBills) {
          add(bill.date, round2(bill.amount * (row.percents.manager / 100)));
        }
      }

      const month = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
      const periodEnd = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
      while (month.getTime() <= periodEnd) {
        const monthStart = new Date(month);
        const monthEnd = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
        if (monthEnd.getTime() < todayUtc) {
          const monthKeyStr = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`;
          const monthSums = await this.prisma.moneyMovement.groupBy({
            by: ['managerId'],
            where: {
              deletedAt: null,
              managerId: { not: null },
              paymentDate: { gte: monthStart, lte: monthEnd },
              direction: { not: DP_MANUAL_DIRECTION_OTHER },
            },
            _sum: { amount: true },
          });
          const candidates = monthSums
            .map((row) => ({
              userId: row.managerId as string,
              salesAmount: toNum(row._sum.amount ?? 0),
            }))
            .filter((row) => planTiers.some((tier) => row.salesAmount >= tier.threshold));
          const planUsers = candidates.length
            ? await this.prisma.user.findMany({
                where: { id: { in: candidates.map((c) => c.userId) } },
                select: { id: true, firstName: true, lastName: true },
              })
            : [];
          const nameById = new Map(
            planUsers.map((u) => [
              u.id,
              [u.lastName, u.firstName].filter(Boolean).join(' ').trim() || null,
            ]),
          );
          for (const candidate of candidates) {
            if (input.employeeId && candidate.userId !== input.employeeId) continue;
            const baseAmount = managerPartsByMonth.get(`${candidate.userId}|${monthKeyStr}`) ?? 0;
            if (baseAmount <= 0) continue;
            const reached = planTiers.filter((tier) => candidate.salesAmount >= tier.threshold);
            // Проценты не суммируются: премия считается по самому высокому достигнутому порогу.
            const percent = reached.length > 0 ? reached[reached.length - 1].percent : 0;
            salesPlanBonuses.push({
              userId: candidate.userId,
              userName: nameById.get(candidate.userId) ?? null,
              month: monthKeyStr,
              salesAmount: round2(candidate.salesAmount),
              reachedTiers: reached.length,
              percent,
              baseAmount,
              amount: round2((baseAmount * percent) / 100),
            });
          }
        }
        month.setUTCMonth(month.getUTCMonth() + 1);
      }
    }
    const salesPlanBonusesTotal = round2(salesPlanBonuses.reduce((sum, b) => sum + b.amount, 0));

    // --- Премия «Нал + QR»: если продажи через терминал за завершившийся месяц
    // составляют менее 50% от всех продаж менеджера — премия 0,5% от остальных
    // (не через терминал: наличные, QR, счёт, перевод на ЛК, банк-приложение)
    // продаж за этот месяц. ---

    const CASH_QR_BONUS_PERCENT = 0.5;
    const cashQrBonuses: Array<{
      userId: string;
      userName: string | null;
      month: string;
      totalSales: number;
      terminalSales: number;
      otherSales: number;
      terminalShare: number;
      amount: number;
    }> = [];
    {
      const month = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
      const periodEnd = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
      while (month.getTime() <= periodEnd) {
        const monthStart = new Date(month);
        const monthEnd = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
        if (monthEnd.getTime() < todayUtc) {
          const formSums = await this.prisma.moneyMovement.groupBy({
            by: ['managerId', 'paymentForm'],
            where: {
              deletedAt: null,
              managerId: { not: null },
              paymentDate: { gte: monthStart, lte: monthEnd },
              direction: { not: DP_MANUAL_DIRECTION_OTHER },
            },
            _sum: { amount: true },
          });
          const totals = new Map<string, { total: number; terminal: number }>();
          for (const row of formSums) {
            const userId = row.managerId as string;
            const agg = totals.get(userId) ?? { total: 0, terminal: 0 };
            const amount = toNum(row._sum.amount ?? 0);
            agg.total += amount;
            if (row.paymentForm === 'TERMINAL') agg.terminal += amount;
            totals.set(userId, agg);
          }
          const winners = [...totals.entries()].filter(
            ([, v]) => v.total > 0 && v.terminal < v.total * 0.5,
          );
          const bonusUsers = winners.length
            ? await this.prisma.user.findMany({
                where: { id: { in: winners.map(([id]) => id) } },
                select: { id: true, firstName: true, lastName: true },
              })
            : [];
          const nameById = new Map(
            bonusUsers.map((u) => [
              u.id,
              [u.lastName, u.firstName].filter(Boolean).join(' ').trim() || null,
            ]),
          );
          for (const [userId, v] of winners) {
            if (input.employeeId && userId !== input.employeeId) continue;
            const otherSales = round2(v.total - v.terminal);
            const amount = round2((otherSales * CASH_QR_BONUS_PERCENT) / 100);
            if (amount <= 0) continue;
            cashQrBonuses.push({
              userId,
              userName: nameById.get(userId) ?? null,
              month: `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`,
              totalSales: round2(v.total),
              terminalSales: round2(v.terminal),
              otherSales,
              terminalShare: round2((v.terminal / v.total) * 100),
              amount,
            });
          }
        }
        month.setUTCMonth(month.getUTCMonth() + 1);
      }
    }
    const cashQrBonusesTotal = round2(cashQrBonuses.reduce((sum, b) => sum + b.amount, 0));

    // --- Агрегации ---

    const byManager = new Map<
      string,
      { managerId: string | null; managerName: string; amount: number; contractsCount: number }
    >();
    const bySurveyor = new Map<
      string,
      { surveyorId: string | null; surveyorName: string; amount: number; contractsCount: number }
    >();
    const byOffice = new Map<
      string,
      {
        officeId: string;
        officeName: string;
        byCategory: Map<
          string,
          {
            categoryId: string;
            categoryCode: string;
            categoryName: string;
            managerAmount: number;
            surveyorAmount: number;
            vsAmount: number;
            brigadierAmount: number;
            signedCount: number;
            signedAmount: number;
            closedCount: number;
            closedAmount: number;
            contractsCount: number;
          }
        >;
      }
    >();

    for (const row of rows) {
      // Личная з/п менеджера — по договорам с известным менеджером.
      if (row.managerName) {
        const key = row.managerId ?? `name:${row.managerName}`;
        const agg = byManager.get(key) ?? {
          managerId: row.managerId,
          managerName: row.managerName,
          amount: 0,
          contractsCount: 0,
        };
        agg.amount = round2(agg.amount + row.managerAmount);
        agg.contractsCount += 1;
        byManager.set(key, agg);
      }
      // Личная з/п замерщика — только где замерщик известен (amount уже 0 без замера);
      // отрицательные суммы (возвраты по доп. соглашениям) уменьшают итог.
      if (row.surveyorName && row.surveyorAmount !== 0) {
        const key = row.surveyorId ?? `name:${row.surveyorName}`;
        const agg = bySurveyor.get(key) ?? {
          surveyorId: row.surveyorId,
          surveyorName: row.surveyorName,
          amount: 0,
          contractsCount: 0,
        };
        agg.amount = round2(agg.amount + row.surveyorAmount);
        agg.contractsCount += 1;
        bySurveyor.set(key, agg);
      }

      const office = byOffice.get(row.officeId) ?? {
        officeId: row.officeId,
        officeName: row.officeName,
        byCategory: new Map(),
      };
      const cat = office.byCategory.get(row.categoryId) ?? {
        categoryId: row.categoryId,
        categoryCode: row.categoryCode,
        categoryName: row.categoryName,
        managerAmount: 0,
        surveyorAmount: 0,
        vsAmount: 0,
        brigadierAmount: 0,
        signedCount: 0,
        signedAmount: 0,
        closedCount: 0,
        closedAmount: 0,
        contractsCount: 0,
      };
      cat.managerAmount = round2(cat.managerAmount + row.managerAmount);
      cat.surveyorAmount = round2(cat.surveyorAmount + row.surveyorAmount);
      cat.vsAmount = round2(cat.vsAmount + row.vsAmount);
      cat.brigadierAmount = round2(cat.brigadierAmount + row.brigadierAmount);
      cat.contractsCount += 1;
      if (row.signedInPeriod) {
        cat.signedCount += 1;
        cat.signedAmount = round2(cat.signedAmount + row.baseAmount);
      }
      if (row.closedInPeriod) {
        cat.closedCount += 1;
        cat.closedAmount = round2(cat.closedAmount + row.baseAmount + row.extraBillsAmount);
      }
      office.byCategory.set(row.categoryId, cat);
      byOffice.set(row.officeId, office);
    }

    const activeCategories = categories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

    const vsByCategory = activeCategories.map((c) => {
      const gross = round2(
        rows.filter((r) => r.categoryId === c.id).reduce((s, r) => s + r.vsAmount, 0),
      );
      return {
        categoryId: c.id,
        categoryCode: c.code,
        categoryName: c.name,
        vsPercent: toNum(c.vsPercent),
        gross,
        net: round2(gross * netFactor),
        // Получатель фонда ВС направления — из привязки в настройках направлений.
        userId: c.leadSpecialistUserId ?? null,
        userName:
          c.leadSpecialist != null
            ? [c.leadSpecialist.lastName, c.leadSpecialist.firstName]
                .filter(Boolean)
                .join(' ')
                .trim() || null
            : null,
      };
    });

    // З/п ведущих специалистов — по получателям из привязок направлений
    // (один сотрудник может вести несколько направлений).
    const byLeadSpecialistMap = new Map<
      string,
      { userId: string; userName: string | null; categories: string[]; amount: number }
    >();
    for (const v of vsByCategory) {
      if (!v.userId || v.gross <= 0) continue;
      const agg = byLeadSpecialistMap.get(v.userId) ?? {
        userId: v.userId,
        userName: v.userName,
        categories: [],
        amount: 0,
      };
      agg.categories.push(v.categoryName);
      agg.amount = round2(agg.amount + v.gross);
      byLeadSpecialistMap.set(v.userId, agg);
    }
    const byLeadSpecialist = Array.from(byLeadSpecialistMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map((e) => ({ ...e, amountNet: round2(e.amount * netFactor) }));

    const brigadierFund = round2(rows.reduce((s, r) => s + r.brigadierAmount, 0));
    // brigadierTotal — синоним фонда (общий пул упразднён; имя оставлено для совместимости
    // со старыми зафиксированными ведомостями).
    const brigadierTotal = brigadierFund;
    // Бригадирский фонд закреплён за пользователем из настроек (может совмещать
    // роль замерщика — тогда з/п складывается из обеих частей).
    const brigadierUserName =
      globalSetting?.brigadier != null
        ? [globalSetting.brigadier.lastName, globalSetting.brigadier.firstName]
            .filter(Boolean)
            .join(' ')
            .trim() || null
        : null;
    const managerPersonalTotal = round2(
      Array.from(byManager.values()).reduce((s, m) => s + m.amount, 0),
    );
    const surveyorFund = round2(rows.reduce((s, r) => s + r.surveyorAmount, 0));

    const stats = {
      signedCount: rows.filter((r) => r.signedInPeriod).length,
      signedAmount: round2(
        rows.filter((r) => r.signedInPeriod).reduce((s, r) => s + r.baseAmount, 0),
      ),
      closedCount: rows.filter((r) => r.closedInPeriod).length,
      closedAmount: round2(
        rows
          .filter((r) => r.closedInPeriod)
          .reduce((s, r) => s + r.baseAmount + r.extraBillsAmount, 0),
      ),
    };

    return {
      period: { from: toDateIso(from), to: toDateIso(to) },
      settings: {
        taxPercent,
        netFactor,
        workModeEnforced: globalSetting?.workModeEnforced ?? false,
        truancyEnforced: globalSetting?.truancyEnforced ?? false,
      },
      totals: {
        contractsCount: rows.length,
        managerPersonalTotal,
        // Налог с менеджеров не удерживается — з/п выдаётся по ставке целиком.
        managerPersonalNet: managerPersonalTotal,
        surveyorFund,
        surveyorFundNet: round2(surveyorFund * netFactor),
        brigadierFund,
        brigadierTotal,
        brigadierTotalNet: round2(brigadierTotal * netFactor),
        vsTotal: round2(vsByCategory.reduce((s, v) => s + v.gross, 0)),
        salariesTotal,
        salesBonusesTotal,
        salesPlanBonusesTotal,
        cashQrBonusesTotal,
        stats,
      },
      brigadier: {
        userId: globalSetting?.brigadierUserId ?? null,
        userName: brigadierUserName,
        total: brigadierTotal,
        totalNet: round2(brigadierTotal * netFactor),
      },
      /** Оклады за период (начисляются целиком, без вычета налога из фондов). */
      salaries,
      /** Премии за места по итогам продаж за завершённые месяцы (журнал ДП). */
      salesBonuses,
      /** Премии за выполнение плана продаж (пороги объёма → % от з/п по договорам). */
      salesPlanBonuses,
      /** Премии «Нал + QR» (терминал < 50% продаж → 0,5% от остальных продаж). */
      cashQrBonuses,
      vsByCategory,
      byLeadSpecialist,
      byManager: Array.from(byManager.values()).sort((a, b) => b.amount - a.amount),
      bySurveyor: Array.from(bySurveyor.values()).sort((a, b) => b.amount - a.amount),
      byOffice: Array.from(byOffice.values())
        .map((o) => ({
          officeId: o.officeId,
          officeName: o.officeName,
          byCategory: activeCategories
            .map((c) => o.byCategory.get(c.id))
            .filter((c): c is NonNullable<typeof c> => !!c),
          totals: {
            vsAmount: round2(Array.from(o.byCategory.values()).reduce((s, c) => s + c.vsAmount, 0)),
            brigadierAmount: round2(
              Array.from(o.byCategory.values()).reduce((s, c) => s + c.brigadierAmount, 0),
            ),
          },
        }))
        .sort((a, b) => a.officeName.localeCompare(b.officeName)),
      rows,
    };
  }

  /**
   * Личный расчёт з/п сотрудника («Моя з/п»): его роли за период — менеджер, замерщик,
   * ведущий специалист направлений, бригадир — и договоры, из которых сложилась его з/п.
   * Менеджеру начисления считаются без вычета налога, остальным ролям — за вычетом.
   */
  async calculateMy(userId: string, input: { dateFrom: string; dateTo: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const full = await this.calculate(input);
    const netFactor = full.settings.netFactor;
    const roundNet = (value: number) => round2(value * netFactor);

    // Участники договора привязываются к пользователям системы; свободные имена из
    // импорта таблиц в личном расчёте не учитываются (могут быть неточными).
    const ledCategories = full.vsByCategory.filter((v) => v.userId === userId);
    const ledCategoryIds = new Set(ledCategories.map((v) => v.categoryId));
    const isBrigadier = full.brigadier?.userId === userId;

    const myRows = full.rows.filter(
      (r) =>
        r.managerId === userId ||
        r.surveyorId === userId ||
        ledCategoryIds.has(r.categoryId) ||
        (isBrigadier && r.brigadierAmount > 0),
    );

    const manager = full.byManager.find((m) => m.managerId === userId) ?? null;
    const surveyor = full.bySurveyor.find((s) => s.surveyorId === userId) ?? null;
    const vsNet = round2(ledCategories.reduce((s, v) => s + v.net, 0));
    const brigadierNet = isBrigadier ? (full.brigadier?.totalNet ?? 0) : 0;

    // Расшифровка по договорам: роль и итоговая сумма по ней.
    const contracts = myRows
      .map((r) => {
        const parts: Array<{ role: string; amount: number }> = [];
        if (r.managerId === userId && r.managerAmount !== 0) {
          parts.push({ role: 'менеджер', amount: r.managerAmount });
        }
        if (r.surveyorId === userId && r.surveyorAmount !== 0) {
          parts.push({ role: 'замерщик', amount: roundNet(r.surveyorAmount) });
        }
        if (ledCategoryIds.has(r.categoryId) && r.vsAmount !== 0) {
          parts.push({ role: 'ВС', amount: roundNet(r.vsAmount) });
        }
        if (isBrigadier && r.brigadierAmount !== 0) {
          parts.push({ role: 'бригадир', amount: roundNet(r.brigadierAmount) });
        }
        return {
          id: r.id,
          number: r.number,
          categoryName: r.categoryName,
          officeName: r.officeName,
          signedAt: r.signedAt,
          closedAt: r.closedAt,
          customerName: r.customerName,
          baseAmount: r.baseAmount,
          roles: parts.map((p) => p.role),
          parts,
          payout: round2(parts.reduce((s, p) => s + p.amount, 0)),
        };
      })
      .filter((c) => c.parts.length > 0)
      .sort((a, b) => (a.signedAt ?? '').localeCompare(b.signedAt ?? ''));

    const managerAmount = manager?.amount ?? 0;
    const surveyorNetAmount = roundNet(surveyor?.amount ?? 0);
    const salary = full.salaries?.find((s) => s.userId === userId)?.amount ?? 0;
    const bonus = round2(
      (full.salesBonuses ?? []).reduce((sum, b) => (b.userId === userId ? sum + b.amount : sum), 0),
    );
    const planBonus = round2(
      (full.salesPlanBonuses ?? []).reduce(
        (sum, b) => (b.userId === userId ? sum + b.amount : sum),
        0,
      ),
    );
    const cashQrBonus = round2(
      (full.cashQrBonuses ?? []).reduce(
        (sum, b) => (b.userId === userId ? sum + b.amount : sum),
        0,
      ),
    );

    return {
      period: full.period,
      employee: {
        userId,
        userName: [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email,
      },
      payouts: {
        manager: managerAmount,
        managerContracts: manager?.contractsCount ?? 0,
        surveyor: surveyorNetAmount,
        surveyorContracts: surveyor?.contractsCount ?? 0,
        vs: vsNet,
        vsCategories: ledCategories.filter((v) => v.gross > 0).map((v) => v.categoryName),
        brigadier: brigadierNet,
        isBrigadier,
        salary,
        bonus,
        planBonus,
        cashQrBonus,
        total: round2(
          managerAmount +
            surveyorNetAmount +
            vsNet +
            brigadierNet +
            salary +
            bonus +
            planBonus +
            cashQrBonus,
        ),
      },
      contracts,
    };
  }
}

/** Полная стоимость договора с учётом всех доп. соглашений (для справки). */
function contractSum(contract: { extraBills: Array<{ amount: Prisma.Decimal }> }): number {
  return contract.extraBills.reduce((s, b) => s + toNum(b.amount), 0);
}
