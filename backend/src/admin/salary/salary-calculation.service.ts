import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { fromDateIso, round2, toDateIso, toNum } from './salary.constants';

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
 *  - ВС (ведущий специалист) = з/п менеджера × %ВС / %мен — фонд по направлению;
 *  - бригадир = з/п менеджера × %бриг / %мен (ремонтные направления, обычно 8.5%);
 *  - «общий» договор (менеджер не вёл / замера не было): соответствующая часть ×2
 *    уходит в общий пул офиса (в таблице — колонки «×(2−м)» / «×(2−зам)»).
 */
@Injectable()
export class SalaryCalculationService {
  constructor(private prisma: PrismaService) {}

  async calculate(input: { dateFrom: string; dateTo: string; officeId?: string }) {
    const from = fromDateIso(input.dateFrom);
    const to = fromDateIso(input.dateTo);
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('Начало периода не может быть позже конца');
    }

    const [globalSetting, categories, rateRules, contracts] = await Promise.all([
      this.prisma.salaryGlobalSetting.findUnique({ where: { id: 'singleton' } }),
      this.prisma.salaryCategory.findMany(),
      this.prisma.salaryRateRule.findMany({ where: { isActive: true } }),
      this.prisma.salaryContract.findMany({
        where: {
          officeId: input.officeId,
          OR: [
            { signedAt: { gte: from, lte: to } },
            { closedAt: { gte: from, lte: to } },
            { extraBills: { some: { date: { gte: from, lte: to } } } },
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

      // Замерщик/ВС/бригадир — пропорционально ставке менеджера (как в таблице: зп × %свой / %мен).
      const scale = managerPercent > 0 ? 1 / (managerPercent / 100) : 0;
      const surveyorAmount = round2(managerAmount * scale * (surveyorPercent / 100));
      const vsAmount = round2(managerAmount * scale * (vsPercent / 100));
      const brigadierAmount = round2(managerAmount * scale * (brigadierPercent / 100));

      const managerCommon = contract.managerHandled ? 0 : round2(managerAmount * 2);
      const surveyorCommon = contract.surveyorHandled ? 0 : round2(surveyorAmount * 2);

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
        managerCommon,
        surveyorCommon,
        signedInPeriod: signedIn,
        closedInPeriod: closedIn,
        totalAmount: round2(base + toNum(contractSum(contract))),
      };
    });

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
            commonPool: number;
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
      // Личная з/п менеджера — только разобранные договоры с известным менеджером.
      if (row.managerHandled && row.managerName) {
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
      // Личная з/п замерщика — только где замер был.
      if (row.surveyorHandled && row.percents.surveyor > 0 && row.surveyorName) {
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
        commonPool: 0,
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
      cat.commonPool = round2(cat.commonPool + row.managerCommon + row.surveyorCommon);
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
      };
    });

    const brigadierFund = round2(rows.reduce((s, r) => s + r.brigadierAmount, 0));
    const commonPool = round2(rows.reduce((s, r) => s + r.managerCommon + r.surveyorCommon, 0));
    // Общий пул «общих» договоров всегда идёт в бригадирский фонд.
    const brigadierTotal = round2(brigadierFund + commonPool);
    const managerPersonalTotal = round2(
      Array.from(byManager.values()).reduce((s, m) => s + m.amount, 0),
    );
    const surveyorFund = round2(
      rows.reduce((s, r) => s + (r.surveyorHandled ? r.surveyorAmount : 0), 0),
    );

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
      },
      totals: {
        contractsCount: rows.length,
        managerPersonalTotal,
        managerPersonalNet: round2(managerPersonalTotal * netFactor),
        surveyorFund,
        surveyorFundNet: round2(surveyorFund * netFactor),
        brigadierFund,
        commonPool,
        brigadierTotal,
        brigadierTotalNet: round2(brigadierTotal * netFactor),
        vsTotal: round2(vsByCategory.reduce((s, v) => s + v.gross, 0)),
        stats,
      },
      vsByCategory,
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
            commonPool: round2(
              Array.from(o.byCategory.values()).reduce((s, c) => s + c.commonPool, 0),
            ),
          },
        }))
        .sort((a, b) => a.officeName.localeCompare(b.officeName)),
      rows,
    };
  }
}

/** Полная стоимость договора с учётом всех доп. соглашений (для справки). */
function contractSum(contract: { extraBills: Array<{ amount: Prisma.Decimal }> }): number {
  return contract.extraBills.reduce((s, b) => s + toNum(b.amount), 0);
}
