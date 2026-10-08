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

@Injectable()
export class SalarySettingsService {
  constructor(private prisma: PrismaService) {}

  /** Полные настройки: глобальные параметры + направления с правилами ставок. */
  async getSettings() {
    await this.ensureDefaults();
    const [global, categories] = await Promise.all([
      this.prisma.salaryGlobalSetting.findUnique({
        where: { id: 'singleton' },
        include: BRIGADIER_INCLUDE,
      }),
      this.prisma.salaryCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          rateRules: { include: { office: { select: { id: true, name: true } } } },
        },
      }),
    ]);
    return {
      global: this.serializeGlobal(global),
      roles: SALARY_ROLE_LABELS,
      categories: categories.map((c) => this.serializeCategory(c)),
    };
  }

  async saveGlobalSettings(dto: SaveSalaryGlobalSettingsDto) {
    await this.ensureGlobalRow();
    const data: Prisma.SalaryGlobalSettingUncheckedUpdateInput = {};
    if (dto.taxPercent !== undefined) data.taxPercent = dto.taxPercent;
    if (dto.brigadierUserId !== undefined) {
      const brigadierUserId = dto.brigadierUserId?.trim() || null;
      if (brigadierUserId) {
        const user = await this.prisma.user.findUnique({ where: { id: brigadierUserId } });
        if (!user) throw new NotFoundException(`Пользователь ${brigadierUserId} не найден`);
      }
      data.brigadierUserId = brigadierUserId;
    }
    const updated = await this.prisma.salaryGlobalSetting.update({
      where: { id: 'singleton' },
      data,
      include: BRIGADIER_INCLUDE,
    });
    return this.serializeGlobal(updated);
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
      brigadierUserId: string | null;
      brigadier?: { id: string; firstName: string | null; lastName: string | null } | null;
      updatedAt: Date;
    } | null,
  ) {
    return {
      taxPercent: toNum(global?.taxPercent ?? 8),
      brigadierUserId: global?.brigadierUserId ?? null,
      brigadierName:
        global?.brigadier != null
          ? [global.brigadier.lastName, global.brigadier.firstName]
              .filter(Boolean)
              .join(' ')
              .trim() || null
          : null,
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
