import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SalaryBonusesService } from './salary-bonuses.service';
import { buildSalaryCalcRows, CONTRACT_CALC_INCLUDE } from './salary-calc-rows';
import { SalaryEmployeeSalariesService } from './salary-employee-salaries.service';
import {
  DEFAULT_AUTO_CLOSE_PENALTY_RUB,
  DEFAULT_CASH_QR_BONUS_PERCENT,
  DEFAULT_WORK_MODE_PENALTY_RUB,
  fromDateIso,
  round2,
  toDateIso,
  toNum,
} from '../salary.constants';
import { loadPaidAmounts, loadPrepaidReachedDates } from './salary-prepaid.helper';

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
    private employeeSalaries: SalaryEmployeeSalariesService,
    private bonuses: SalaryBonusesService,
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

    // Фильтр по сотруднику — договоры, где он менеджер, замерщик или ведущий
    // специалист направления (как «Менеджер» в ДП).
    const employeeFilter = input.employeeId
      ? [
          {
            OR: [
              { managerId: input.employeeId },
              { surveyorId: input.employeeId },
              { category: { leadSpecialistUserId: input.employeeId } },
            ],
          },
        ]
      : [];
    const CONTRACT_INCLUDE = CONTRACT_CALC_INCLUDE;

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
                // Договор, заключённый раньше, но набравший минимальную предоплату
                // в периоде — з/п стартует с этой даты.
                { prepaidReachedAt: { gte: from, lte: to } },
              ],
            },
            ...employeeFilter,
          ],
        },
        include: CONTRACT_INCLUDE,
        orderBy: [{ signedAt: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    // Авто-договоры, набравшие минимальную предоплату в периоде: актуальная дата
    // живёт в оплатах пакета, поэтому выборка по датам записи могла их не взять.
    const paidInPeriod = await this.prisma.contractDocumentPackagePayment.findMany({
      where: { paymentDate: { gte: from, lte: to } },
      select: { packageId: true },
      distinct: ['packageId'],
    });
    if (paidInPeriod.length > 0) {
      const fetchedIds = contracts.map((c) => c.id);
      const extra = await this.prisma.salaryContract.findMany({
        where: {
          id: { notIn: fetchedIds },
          officeId: input.officeId,
          sourcePackageId: { in: paidInPeriod.map((p) => p.packageId) },
          AND: employeeFilter,
        },
        include: CONTRACT_INCLUDE,
      });
      contracts.push(
        ...extra.sort(
          (a, b) =>
            (a.signedAt?.getTime() ?? 0) - (b.signedAt?.getTime() ?? 0) ||
            a.createdAt.getTime() - b.createdAt.getTime(),
        ),
      );
    }

    // Дата набора минимальной предоплаты для авто-договоров считается «на лету»
    // по первичным оплатам пакета («Оплаты и Управление договором») — не по
    // сохранённому при синхронизации полю, чтобы расчёт не зависел от её
    // актуальности. Ручные договоры используют дату из записи (задаётся вручную).
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const prepaidEntries = contracts
      .filter((c) => c.sourcePackageId != null)
      .map((c) => ({
        packageId: c.sourcePackageId as string,
        baseAmount: toNum(c.baseAmount),
        minPrepaidPercent: toNum(categoryById.get(c.categoryId)?.minPrepaidPercent ?? 0),
      }));
    const prepaidByPackage = await loadPrepaidReachedDates(this.prisma, prepaidEntries);
    // Сколько реально оплачено по авто-договорам (для колонки «Оплачено»).
    const paidByPackage = await loadPaidAmounts(
      this.prisma,
      contracts.filter((c) => c.sourcePackageId != null).map((c) => c.sourcePackageId as string),
    );

    const taxPercent = toNum(globalSetting?.taxPercent ?? 8);
    const netFactor = round2((1 - taxPercent / 100) * 10000) / 10000;

    const rulesByKey = new Map<string, number>();
    for (const rule of rateRules) {
      rulesByKey.set(
        `${rule.categoryId}|${rule.officeId ?? '*'}|${rule.role}`,
        toNum(rule.percent),
      );
    }

    const rows = buildSalaryCalcRows({
      contracts,
      rulesByKey,
      from,
      to,
      prepaidByPackage,
      paidByPackage,
    });

    // --- Оклады (1/N за день, удержания за режим, автозакрытия и прогулы) и премии
    // (места по продажам, план продаж, «QR + Н») — выделенные сервисы. ---

    const today = new Date();
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const [{ salaries, salariesTotal }, bonuses] = await Promise.all([
      this.employeeSalaries.calculate({
        from,
        to,
        todayUtc,
        workModeEnforced: globalSetting?.workModeEnforced ?? false,
        workModePenaltyRub: toNum(
          globalSetting?.workModePenaltyRub ?? DEFAULT_WORK_MODE_PENALTY_RUB,
        ),
        autoCloseEnforced: globalSetting?.autoCloseEnforced ?? false,
        autoClosePenaltyRub: toNum(
          globalSetting?.autoClosePenaltyRub ?? DEFAULT_AUTO_CLOSE_PENALTY_RUB,
        ),
        truancyEnforced: globalSetting?.truancyEnforced ?? false,
        employeeSalaries,
      }),
      this.bonuses.calculate({
        from,
        to,
        todayUtc,
        settings: globalSetting,
        rows,
        employeeId: input.employeeId,
      }),
    ]);
    const {
      salesBonuses,
      salesBonusesTotal,
      salesPlanBonuses,
      salesPlanBonusesTotal,
      cashQrBonuses,
      cashQrBonusesTotal,
    } = bonuses;

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
        autoCloseEnforced: globalSetting?.autoCloseEnforced ?? false,
        truancyEnforced: globalSetting?.truancyEnforced ?? false,
        cashQrBonusEnforced: globalSetting?.cashQrBonusEnforced ?? true,
        cashQrBonusPercent: toNum(
          globalSetting?.cashQrBonusPercent ?? DEFAULT_CASH_QR_BONUS_PERCENT,
        ),
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
      /** Премии «QR + Н» (терминал < 50% продаж → % от остальных продаж). */
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
}
