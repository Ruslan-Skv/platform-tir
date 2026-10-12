import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_SALARY_CATEGORIES, SALARY_ROLE_LABELS, toNum } from './salary.constants';
import { SaveSalaryGlobalSettingsDto } from './dto/save-salary-global-settings.dto';
import {
  CreateSalaryCategoryDto,
  SALARY_ROLE_VALUES,
  UpdateSalaryCategoryDto,
  UpsertSalaryRateRuleDto,
} from './dto/salary-category.dto';

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
    const [global, categories, employeeSalaries] = await Promise.all([
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
    ]);
    return {
      global: {
        ...this.serializeGlobal(global),
        employeeSalaries: employeeSalaries.map((s) => ({
          userId: s.userId,
          userName: userFullName(s.user),
          monthlySalary: toNum(s.monthlySalary),
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
    if (dto.truancyEnforced !== undefined) data.truancyEnforced = dto.truancyEnforced;
    if (dto.salesBonusFirstPlace !== undefined)
      data.salesBonusFirstPlace = dto.salesBonusFirstPlace;
    if (dto.salesBonusSecondPlace !== undefined)
      data.salesBonusSecondPlace = dto.salesBonusSecondPlace;
    if (dto.salesBonusThirdPlace !== undefined)
      data.salesBonusThirdPlace = dto.salesBonusThirdPlace;
    if (dto.salesBonusMinSales !== undefined) data.salesBonusMinSales = dto.salesBonusMinSales;
    if (dto.salesPlanThreshold1 !== undefined) data.salesPlanThreshold1 = dto.salesPlanThreshold1;
    if (dto.salesPlanThreshold2 !== undefined) data.salesPlanThreshold2 = dto.salesPlanThreshold2;
    if (dto.salesPlanThreshold3 !== undefined) data.salesPlanThreshold3 = dto.salesPlanThreshold3;
    if (dto.salesPlanPercent1 !== undefined) data.salesPlanPercent1 = dto.salesPlanPercent1;
    if (dto.salesPlanPercent2 !== undefined) data.salesPlanPercent2 = dto.salesPlanPercent2;
    if (dto.salesPlanPercent3 !== undefined) data.salesPlanPercent3 = dto.salesPlanPercent3;
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
      truancyEnforced?: boolean;
      salesBonusFirstPlace?: Prisma.Decimal;
      salesBonusSecondPlace?: Prisma.Decimal;
      salesBonusThirdPlace?: Prisma.Decimal;
      salesBonusMinSales?: Prisma.Decimal;
      salesPlanThreshold1?: Prisma.Decimal;
      salesPlanThreshold2?: Prisma.Decimal;
      salesPlanThreshold3?: Prisma.Decimal;
      salesPlanPercent1?: Prisma.Decimal;
      salesPlanPercent2?: Prisma.Decimal;
      salesPlanPercent3?: Prisma.Decimal;
      brigadierUserId: string | null;
      brigadier?: { id: string; firstName: string | null; lastName: string | null } | null;
      updatedAt: Date;
    } | null,
  ) {
    return {
      taxPercent: toNum(global?.taxPercent ?? 8),
      workModeEnforced: global?.workModeEnforced ?? false,
      truancyEnforced: global?.truancyEnforced ?? false,
      salesBonusFirstPlace: toNum(global?.salesBonusFirstPlace ?? 0),
      salesBonusSecondPlace: toNum(global?.salesBonusSecondPlace ?? 0),
      salesBonusThirdPlace: toNum(global?.salesBonusThirdPlace ?? 0),
      salesBonusMinSales: toNum(global?.salesBonusMinSales ?? 0),
      salesPlanThreshold1: toNum(global?.salesPlanThreshold1 ?? 0),
      salesPlanThreshold2: toNum(global?.salesPlanThreshold2 ?? 0),
      salesPlanThreshold3: toNum(global?.salesPlanThreshold3 ?? 0),
      salesPlanPercent1: toNum(global?.salesPlanPercent1 ?? 0),
      salesPlanPercent2: toNum(global?.salesPlanPercent2 ?? 0),
      salesPlanPercent3: toNum(global?.salesPlanPercent3 ?? 0),
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
