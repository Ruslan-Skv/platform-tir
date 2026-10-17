import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  DEFAULT_AUTO_CLOSE_PENALTY_RUB,
  DEFAULT_CASH_QR_BONUS_PERCENT,
  DEFAULT_SALARY_CATEGORIES,
  DEFAULT_WORK_MODE_PENALTY_RUB,
  SALARY_ROLE_LABELS,
  toNum,
} from '../salary.constants';
import {
  SaveSalaryGlobalSettingsDto,
  SalaryManagerSalesPlanDto,
} from '../dto/save-salary-global-settings.dto';
import {
  CreateSalaryCategoryDto,
  SALARY_ROLE_VALUES,
  UpdateSalaryCategoryDto,
  UpsertSalaryRateRuleDto,
} from '../dto/salary-category.dto';

/** Пользователь-бригадир для ответов настроек: id + ФИО. */
const BRIGADIER_INCLUDE = {
  brigadier: { select: { id: true, firstName: true, lastName: true } },
} as const;

/** Пользователь-ВС направления для ответов настроек: id + ФИО. */
const CATEGORY_LEAD_SPECIALIST_INCLUDE = {
  leadSpecialist: { select: { id: true, firstName: true, lastName: true } },
} as const;

/** ФИО пользователя для ответов («Фамилия Имя»), либо null. */
function userFullName(
  user: { firstName: string | null; lastName: string | null } | null | undefined,
) {
  return user != null
    ? [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || null
    : null;
}

@Injectable()
export class SalarySettingsService {
  constructor(private prisma: PrismaService) {}

  /** Полные настройки: глобальные параметры + направления с правилами ставок. */
  async getSettings() {
    await this.ensureDefaults();
    const [global, categories, employeeSalaries, managerSalesPlans] = await Promise.all([
      this.prisma.salaryGlobalSetting.findUnique({
        where: { id: 'singleton' },
        include: BRIGADIER_INCLUDE,
      }),
      this.prisma.salaryCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          rateRules: { include: { office: { select: { id: true, name: true } } } },
          ...CATEGORY_LEAD_SPECIALIST_INCLUDE,
        },
      }),
      this.prisma.salaryEmployeeSalary.findMany({
        where: { monthlySalary: { gt: 0 } },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { userId: 'asc' },
      }),
      this.prisma.salaryManagerSalesPlan.findMany({
        where: {
          OR: [{ threshold1: { gt: 0 } }, { threshold2: { gt: 0 } }, { threshold3: { gt: 0 } }],
        },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { userId: 'asc' },
      }),
    ]);
    return {
      global: {
        ...this.serializeGlobal(global),
        employeeSalaries: employeeSalaries.map((s) => ({
          userId: s.userId,
          userName: userFullName(s.user),
          monthlySalary: toNum(s.monthlySalary),
        })),
        managerSalesPlans: managerSalesPlans.map((p) => ({
          userId: p.userId,
          userName: userFullName(p.user),
          threshold1: toNum(p.threshold1),
          threshold2: toNum(p.threshold2),
          threshold3: toNum(p.threshold3),
          percent1: toNum(p.percent1),
          percent2: toNum(p.percent2),
          percent3: toNum(p.percent3),
        })),
      },
      roles: SALARY_ROLE_LABELS,
      categories: categories.map((c) => this.serializeCategory(c)),
    };
  }

  async saveGlobalSettings(dto: SaveSalaryGlobalSettingsDto) {
    await this.ensureGlobalRow();
    const data: Prisma.SalaryGlobalSettingUncheckedUpdateInput = {};
    if (dto.taxPercent !== undefined) data.taxPercent = dto.taxPercent;
    if (dto.workModeEnforced !== undefined) data.workModeEnforced = dto.workModeEnforced;
    if (dto.workModePenaltyRub !== undefined) data.workModePenaltyRub = dto.workModePenaltyRub;
    if (dto.autoCloseEnforced !== undefined) data.autoCloseEnforced = dto.autoCloseEnforced;
    if (dto.autoClosePenaltyRub !== undefined) {
      data.autoClosePenaltyRub = dto.autoClosePenaltyRub;
    }
    if (dto.cashQrBonusEnforced !== undefined) {
      data.cashQrBonusEnforced = dto.cashQrBonusEnforced;
    }
    if (dto.cashQrBonusPercent !== undefined) {
      data.cashQrBonusPercent = dto.cashQrBonusPercent;
    }
    if (dto.truancyEnforced !== undefined) data.truancyEnforced = dto.truancyEnforced;
    if (dto.salesBonusFirstPlace !== undefined)
      data.salesBonusFirstPlace = dto.salesBonusFirstPlace;
    if (dto.salesBonusSecondPlace !== undefined)
      data.salesBonusSecondPlace = dto.salesBonusSecondPlace;
    if (dto.salesBonusThirdPlace !== undefined)
      data.salesBonusThirdPlace = dto.salesBonusThirdPlace;
    if (dto.salesBonusMinSales !== undefined) data.salesBonusMinSales = dto.salesBonusMinSales;
    if (dto.brigadierUserId !== undefined) {
      data.brigadierUserId = await this.resolveUserId(dto.brigadierUserId);
    }
    const updated = await this.prisma.salaryGlobalSetting.update({
      where: { id: 'singleton' },
      data,
      include: BRIGADIER_INCLUDE,
    });
    if (dto.employeeSalaries !== undefined) {
      await this.saveEmployeeSalaries(dto.employeeSalaries);
    }
    if (dto.managerSalesPlans !== undefined) {
      await this.saveManagerSalesPlans(dto.managerSalesPlans);
    }
    return this.serializeGlobal(updated);
  }

  /**
   * Оклады сотрудников: передан полный список — заменяем существующий.
   * null/0 → оклад снимается (строка удаляется).
   */
  private async saveEmployeeSalaries(
    items: Array<{ userId: string; monthlySalary: number | null }>,
  ) {
    const keep = new Map<string, number>();
    for (const item of items) {
      const userId = await this.resolveUserId(item.userId);
      if (!userId) throw new BadRequestException('Не указан сотрудник для оклада');
      const amount = item.monthlySalary ?? 0;
      if (amount > 0) keep.set(userId, amount);
    }
    await this.prisma.$transaction([
      this.prisma.salaryEmployeeSalary.deleteMany({
        where: { userId: { notIn: [...keep.keys()] } },
      }),
      ...[...keep.entries()].map(([userId, monthlySalary]) =>
        this.prisma.salaryEmployeeSalary.upsert({
          where: { userId },
          create: { userId, monthlySalary },
          update: { monthlySalary },
        }),
      ),
    ]);
  }

  /**
   * Индивидуальные планы продаж менеджеров: передан полный список — заменяем
   * существующий. Строка без ни одного заданного порога → план снимается.
   */
  private async saveManagerSalesPlans(items: SalaryManagerSalesPlanDto[]) {
    type PlanData = {
      userId: string;
      threshold1: number;
      threshold2: number;
      threshold3: number;
      percent1: number;
      percent2: number;
      percent3: number;
    };
    const keep = new Map<string, PlanData>();
    for (const item of items) {
      const userId = await this.resolveUserId(item.userId);
      if (!userId) throw new BadRequestException('Не указан менеджер для плана продаж');
      const plan: PlanData = {
        userId,
        threshold1: item.threshold1 ?? 0,
        threshold2: item.threshold2 ?? 0,
        threshold3: item.threshold3 ?? 0,
        percent1: item.percent1 ?? 0,
        percent2: item.percent2 ?? 0,
        percent3: item.percent3 ?? 0,
      };
      if (plan.threshold1 > 0 || plan.threshold2 > 0 || plan.threshold3 > 0) {
        keep.set(userId, plan);
      }
    }
    await this.prisma.$transaction([
      this.prisma.salaryManagerSalesPlan.deleteMany({
        where: { userId: { notIn: [...keep.keys()] } },
      }),
      ...[...keep.values()].map((plan) =>
        this.prisma.salaryManagerSalesPlan.upsert({
          where: { userId: plan.userId },
          create: plan,
          update: {
            threshold1: plan.threshold1,
            threshold2: plan.threshold2,
            threshold3: plan.threshold3,
            percent1: plan.percent1,
            percent2: plan.percent2,
            percent3: plan.percent3,
          },
        }),
      ),
    ]);
  }

  // --- Направления ---

  async createCategory(dto: CreateSalaryCategoryDto) {
    const existing = await this.prisma.salaryCategory.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException(`Направление с кодом «${dto.code}» уже существует`);
    }
    return this.prisma.salaryCategory.create({
      data: {
        code: dto.code,
        name: dto.name,
        vsPercent: dto.vsPercent ?? 0,
        splitSign: dto.splitSign ?? 0.7,
        splitClose: dto.splitClose ?? 0.3,
        managerPercent: dto.managerPercent ?? 3,
        surveyorPercent: dto.surveyorPercent ?? 0,
        brigadierPercent: dto.brigadierPercent ?? 0,
        minPrepaidPercent: dto.minPrepaidPercent ?? 0,
        leadSpecialistUserId: await this.resolveUserId(dto.leadSpecialistUserId),
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateSalaryCategoryDto) {
    await this.ensureCategory(id);
    const data: Prisma.SalaryCategoryUncheckedUpdateInput = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.vsPercent !== undefined) data.vsPercent = dto.vsPercent;
    if (dto.splitSign !== undefined) data.splitSign = dto.splitSign;
    if (dto.splitClose !== undefined) data.splitClose = dto.splitClose;
    if (dto.managerPercent !== undefined) data.managerPercent = dto.managerPercent;
    if (dto.surveyorPercent !== undefined) data.surveyorPercent = dto.surveyorPercent;
    if (dto.brigadierPercent !== undefined) data.brigadierPercent = dto.brigadierPercent;
    if (dto.minPrepaidPercent !== undefined) data.minPrepaidPercent = dto.minPrepaidPercent;
    if (dto.leadSpecialistUserId !== undefined) {
      data.leadSpecialistUserId = await this.resolveUserId(dto.leadSpecialistUserId);
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    return this.prisma.salaryCategory.update({ where: { id }, data });
  }

  async removeCategory(id: string) {
    await this.ensureCategory(id);
    const contractsCount = await this.prisma.salaryContract.count({ where: { categoryId: id } });
    if (contractsCount > 0) {
      throw new BadRequestException(
        `Нельзя удалить направление: к нему привязано договоров — ${contractsCount}. Снимите направление с активного использования.`,
      );
    }
    await this.prisma.salaryCategory.delete({ where: { id } });
    return { ok: true };
  }

  // --- Правила ставок (переопределения по офисам) ---

  async upsertRateRule(categoryId: string, dto: UpsertSalaryRateRuleDto) {
    await this.ensureCategory(categoryId);
    if (dto.officeId) {
      const office = await this.prisma.office.findUnique({ where: { id: dto.officeId } });
      if (!office) throw new NotFoundException(`Офис ${dto.officeId} не найден`);
    }
    if (!SALARY_ROLE_VALUES.includes(dto.role)) {
      throw new BadRequestException(`Неизвестная должность: ${dto.role}`);
    }
    // NULL в officeId не покрыт UNIQUE в Postgres — ищем существующее правило вручную.
    const existing = await this.prisma.salaryRateRule.findFirst({
      where: { categoryId, officeId: dto.officeId ?? null, role: dto.role },
    });
    const rule = existing
      ? await this.prisma.salaryRateRule.update({
          where: { id: existing.id },
          data: { percent: dto.percent, isActive: true },
        })
      : await this.prisma.salaryRateRule.create({
          data: {
            categoryId,
            officeId: dto.officeId ?? null,
            role: dto.role,
            percent: dto.percent,
          },
        });
    return rule;
  }

  async removeRateRule(categoryId: string, ruleId: string) {
    const rule = await this.prisma.salaryRateRule.findFirst({
      where: { id: ruleId, categoryId },
    });
    if (!rule) throw new NotFoundException(`Правило ${ruleId} не найдено`);
    await this.prisma.salaryRateRule.delete({ where: { id: ruleId } });
    return { ok: true };
  }

  // --- Внутреннее ---

  private serializeGlobal(
    global: {
      taxPercent: Prisma.Decimal;
      workModeEnforced?: boolean;
      workModePenaltyRub?: Prisma.Decimal;
      autoCloseEnforced?: boolean;
      autoClosePenaltyRub?: Prisma.Decimal;
      cashQrBonusEnforced?: boolean;
      cashQrBonusPercent?: Prisma.Decimal;
      truancyEnforced?: boolean;
      salesBonusFirstPlace?: Prisma.Decimal;
      salesBonusSecondPlace?: Prisma.Decimal;
      salesBonusThirdPlace?: Prisma.Decimal;
      salesBonusMinSales?: Prisma.Decimal;
      brigadierUserId: string | null;
      brigadier?: { id: string; firstName: string | null; lastName: string | null } | null;
      updatedAt: Date;
    } | null,
  ) {
    return {
      taxPercent: toNum(global?.taxPercent ?? 8),
      workModeEnforced: global?.workModeEnforced ?? false,
      workModePenaltyRub: toNum(global?.workModePenaltyRub ?? DEFAULT_WORK_MODE_PENALTY_RUB),
      autoCloseEnforced: global?.autoCloseEnforced ?? false,
      autoClosePenaltyRub: toNum(global?.autoClosePenaltyRub ?? DEFAULT_AUTO_CLOSE_PENALTY_RUB),
      cashQrBonusEnforced: global?.cashQrBonusEnforced ?? true,
      cashQrBonusPercent: toNum(global?.cashQrBonusPercent ?? DEFAULT_CASH_QR_BONUS_PERCENT),
      truancyEnforced: global?.truancyEnforced ?? false,
      salesBonusFirstPlace: toNum(global?.salesBonusFirstPlace ?? 0),
      salesBonusSecondPlace: toNum(global?.salesBonusSecondPlace ?? 0),
      salesBonusThirdPlace: toNum(global?.salesBonusThirdPlace ?? 0),
      salesBonusMinSales: toNum(global?.salesBonusMinSales ?? 0),
      brigadierUserId: global?.brigadierUserId ?? null,
      brigadierName: userFullName(global?.brigadier),
      updatedAt: global?.updatedAt ?? null,
    };
  }

  private serializeCategory(category: {
    id: string;
    code: string;
    name: string;
    vsPercent: Prisma.Decimal;
    splitSign: Prisma.Decimal;
    splitClose: Prisma.Decimal;
    managerPercent: Prisma.Decimal;
    surveyorPercent: Prisma.Decimal;
    brigadierPercent: Prisma.Decimal;
    minPrepaidPercent: Prisma.Decimal;
    leadSpecialistUserId: string | null;
    leadSpecialist?: { id: string; firstName: string | null; lastName: string | null } | null;
    isActive: boolean;
    sortOrder: number;
    rateRules: Array<{
      id: string;
      officeId: string | null;
      role: string;
      percent: Prisma.Decimal;
      isActive: boolean;
      office: { id: string; name: string } | null;
    }>;
  }) {
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      vsPercent: toNum(category.vsPercent),
      splitSign: toNum(category.splitSign),
      splitClose: toNum(category.splitClose),
      managerPercent: toNum(category.managerPercent),
      surveyorPercent: toNum(category.surveyorPercent),
      brigadierPercent: toNum(category.brigadierPercent),
      minPrepaidPercent: toNum(category.minPrepaidPercent),
      leadSpecialistUserId: category.leadSpecialistUserId,
      leadSpecialistName: userFullName(category.leadSpecialist),
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      rateRules: category.rateRules.map((r) => ({
        id: r.id,
        officeId: r.officeId,
        officeName: r.office?.name ?? null,
        role: r.role,
        percent: toNum(r.percent),
        isActive: r.isActive,
      })),
    };
  }

  /** Первичный посев: глобальная строка + направления по умолчанию (идемпотентно). */
  private async ensureDefaults() {
    await this.ensureGlobalRow();
    const count = await this.prisma.salaryCategory.count();
    if (count === 0) {
      await this.prisma.salaryCategory.createMany({
        data: DEFAULT_SALARY_CATEGORIES.map((c) => ({ ...c })),
      });
    }
  }

  /** Идентификатор пользователя из DTO: '' → null, с проверкой существования. */
  private async resolveUserId(userId: string | null | undefined): Promise<string | null> {
    const trimmed = userId?.trim() || null;
    if (trimmed) {
      const user = await this.prisma.user.findUnique({ where: { id: trimmed } });
      if (!user) throw new NotFoundException(`Пользователь ${trimmed} не найден`);
    }
    return trimmed;
  }

  private ensureGlobalRow() {
    return this.prisma.salaryGlobalSetting.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    });
  }

  private async ensureCategory(id: string) {
    const category = await this.prisma.salaryCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`Направление ${id} не найдено`);
    return category;
  }
}
