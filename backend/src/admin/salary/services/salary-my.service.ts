import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { round2 } from '../salary.constants';
import { SalaryCalculationService } from './salary-calculation.service';

/**
 * Личный расчёт з/п сотрудника («Моя з/п»): его роли за период — менеджер, замерщик,
 * ведущий специалист направлений, бригадир — оклад и премии, и договоры, из которых
 * сложилась его з/п. Менеджеру начисления считаются без вычета налога, остальным — за вычетом.
 */
@Injectable()
export class SalaryMyService {
  constructor(
    private prisma: PrismaService,
    private calculation: SalaryCalculationService,
  ) {}

  async calculateMy(userId: string, input: { dateFrom: string; dateTo: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const full = await this.calculation.calculate(input);
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
    const salaryRow = full.salaries?.find((s) => s.userId === userId) ?? null;
    const salary = salaryRow?.amount ?? 0;
    const sumMine = (list: Array<{ userId: string; amount: number }> = []) =>
      round2(list.reduce((sum, b) => (b.userId === userId ? sum + b.amount : sum), 0));
    const bonus = sumMine(full.salesBonuses);
    const planBonus = sumMine(full.salesPlanBonuses);
    const cashQrBonus = sumMine(full.cashQrBonuses);

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
      /** Расшифровка удержаний из оклада (когда и за что). */
      deductions: salaryRow?.deductions ?? [],
    };
  }
}
