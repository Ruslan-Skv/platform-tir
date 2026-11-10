import { BadRequestException, Injectable } from '@nestjs/common';
import { ContractDocumentPackageKind, ContractDocumentPackageStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  ApplyRepairWorkPeriodToAllDto,
  SetRepairContractSettingsDto,
} from './dto/settings/set-repair-settings.dto';
import { SetRepairWorkOrderSettingsDto } from './dto/settings/set-repair-work-order-settings.dto';
import { SetWindowsWorkOrderMarkupDto } from './dto/settings/set-windows-work-order-markup.dto';
import {
  DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_WINDOWS_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
  isWorkPeriodManualInFormData,
  setWorkPeriodInFormData,
} from './repair-contract-work-period';
import { PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT } from './list-pipeline/package-list-pipeline-status';

/** Нормализация порога оплаты Акта начала работ (1–100; null/некорректное — 70). */
export function clampRepairWorkStartMinPayPct(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT;
  const t = Math.trunc(raw);
  return t >= 1 && t <= 100 ? t : PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT;
}

/**
 * Порог оплаты Акта начала работ по ремонту из глобальных настроек —
 * для любых сервисов с PrismaService, без DI-зависимости от модуля настроек.
 */
export async function resolveRepairWorkStartMinPayPct(prisma: PrismaService): Promise<number> {
  try {
    const row = await prisma.contractDocumentRepairSettings.findUnique({
      where: { kind: ContractDocumentPackageKind.REPAIR },
      select: { repairWorkStartMinPayPercent: true },
    });
    return clampRepairWorkStartMinPayPct(row?.repairWorkStartMinPayPercent);
  } catch {
    return PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT;
  }
}

@Injectable()
export class ContractDocumentPackageKindSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private fallbackWorkPeriodDays(kind: ContractDocumentPackageKind): number {
    return kind === ContractDocumentPackageKind.WINDOWS ||
      kind === ContractDocumentPackageKind.DOORS ||
      kind === ContractDocumentPackageKind.BLINDS ||
      kind === ContractDocumentPackageKind.CEILINGS
      ? DEFAULT_WINDOWS_CONTRACT_WORK_PERIOD_DAYS
      : DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS;
  }

  async resolveDefaultWorkPeriodDays(kind: ContractDocumentPackageKind): Promise<number> {
    const fallback = this.fallbackWorkPeriodDays(kind);
    const row = await this.prisma.contractDocumentRepairSettings.findUnique({
      where: { kind },
      select: { defaultWorkPeriodDays: true },
    });
    const days = row?.defaultWorkPeriodDays ?? fallback;
    return Number.isFinite(days) && days >= 1 ? Math.trunc(days) : fallback;
  }

  /** @deprecated Используйте {@link resolveDefaultWorkPeriodDays} */
  async resolveDefaultRepairWorkPeriodDays(): Promise<number> {
    return this.resolveDefaultWorkPeriodDays(ContractDocumentPackageKind.REPAIR);
  }

  private supportsWorkOrderMarkup(kind: ContractDocumentPackageKind): boolean {
    return (
      kind === ContractDocumentPackageKind.WINDOWS ||
      kind === ContractDocumentPackageKind.DOORS ||
      kind === ContractDocumentPackageKind.BLINDS ||
      kind === ContractDocumentPackageKind.CEILINGS
    );
  }

  async getWorkPeriodSettings(kind: ContractDocumentPackageKind) {
    const days = await this.resolveDefaultWorkPeriodDays(kind);
    const row = await this.prisma.contractDocumentRepairSettings.findUnique({
      where: { kind },
      select: { updatedAt: true },
    });
    const base = {
      kind,
      defaultWorkPeriodDays: days,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
    if (this.supportsWorkOrderMarkup(kind)) {
      return {
        ...base,
        windowsWorkOrderMarkupPercent: await this.resolveWorkOrderMarkupPercent(kind),
        ...(kind === ContractDocumentPackageKind.CEILINGS
          ? { ceilingsWorkOrderCornerPrice: await this.resolveCeilingsWorkOrderCornerPrice() }
          : {}),
      };
    }
    return base;
  }

  async getRepairSettings() {
    const base = await this.getWorkPeriodSettings(ContractDocumentPackageKind.REPAIR);
    const row = await this.prisma.contractDocumentRepairSettings.findUnique({
      where: { kind: ContractDocumentPackageKind.REPAIR },
      select: {
        repairWorkOrderMarkupPercent: true,
        repairWorkOrderTaxPercent: true,
        repairWorkStartMinPayPercent: true,
      },
    });
    return {
      ...base,
      workOrderMarkupPercent: row?.repairWorkOrderMarkupPercent ?? null,
      workOrderTaxPercent: row?.repairWorkOrderTaxPercent ?? null,
      workStartMinPayPercent: clampRepairWorkStartMinPayPct(row?.repairWorkStartMinPayPercent),
    };
  }

  async getWindowsSettings() {
    return this.getWorkPeriodSettings(ContractDocumentPackageKind.WINDOWS);
  }

  async setWorkPeriodSettings(
    kind: ContractDocumentPackageKind,
    dto: SetRepairContractSettingsDto,
    updatedById?: string,
  ) {
    // Частичное обновление: незаданные поля сохраняют текущие значения.
    const existing = await this.prisma.contractDocumentRepairSettings.findUnique({
      where: { kind },
      select: { defaultWorkPeriodDays: true },
    });
    const nextDays =
      dto.defaultWorkPeriodDays ??
      existing?.defaultWorkPeriodDays ??
      this.fallbackWorkPeriodDays(kind);
    // Порог оплаты Акта начала работ — только у направления «Ремонт».
    const repairPct =
      kind === ContractDocumentPackageKind.REPAIR && dto.workStartMinPayPercent !== undefined
        ? { repairWorkStartMinPayPercent: dto.workStartMinPayPercent }
        : {};
    const row = await this.prisma.contractDocumentRepairSettings.upsert({
      where: { kind },
      create: {
        kind,
        defaultWorkPeriodDays: nextDays,
        ...repairPct,
        updatedById: updatedById ?? null,
      },
      update: {
        defaultWorkPeriodDays: nextDays,
        ...repairPct,
        updatedById: updatedById ?? null,
      },
      select: {
        defaultWorkPeriodDays: true,
        repairWorkStartMinPayPercent: true,
        updatedAt: true,
      },
    });
    return {
      kind,
      defaultWorkPeriodDays: row.defaultWorkPeriodDays,
      ...(kind === ContractDocumentPackageKind.REPAIR
        ? {
            workStartMinPayPercent: clampRepairWorkStartMinPayPct(row.repairWorkStartMinPayPercent),
          }
        : {}),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async setRepairSettings(dto: SetRepairContractSettingsDto, updatedById?: string) {
    return this.setWorkPeriodSettings(ContractDocumentPackageKind.REPAIR, dto, updatedById);
  }

  async setWindowsSettings(
    dto: { defaultWorkPeriodDays?: number; windowsWorkOrderMarkupPercent?: number },
    updatedById?: string,
  ) {
    const kind = ContractDocumentPackageKind.WINDOWS;
    const fallbackDays = this.fallbackWorkPeriodDays(kind);
    const currentDays = await this.resolveDefaultWorkPeriodDays(kind);
    const row = await this.prisma.contractDocumentRepairSettings.upsert({
      where: { kind },
      create: {
        kind,
        defaultWorkPeriodDays: dto.defaultWorkPeriodDays ?? fallbackDays,
        windowsWorkOrderMarkupPercent:
          dto.windowsWorkOrderMarkupPercent ?? DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
        updatedById: updatedById ?? null,
      },
      update: {
        ...(dto.defaultWorkPeriodDays !== undefined
          ? { defaultWorkPeriodDays: dto.defaultWorkPeriodDays }
          : {}),
        ...(dto.windowsWorkOrderMarkupPercent !== undefined
          ? { windowsWorkOrderMarkupPercent: dto.windowsWorkOrderMarkupPercent }
          : {}),
        updatedById: updatedById ?? null,
      },
      select: { defaultWorkPeriodDays: true, updatedAt: true },
    });
    return {
      kind,
      defaultWorkPeriodDays: row.defaultWorkPeriodDays ?? currentDays,
      windowsWorkOrderMarkupPercent: await this.resolveWorkOrderMarkupPercent(kind),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async applyWorkPeriodToAllPackages(
    kind: ContractDocumentPackageKind,
    dto: ApplyRepairWorkPeriodToAllDto,
  ) {
    const packages = await this.prisma.contractDocumentPackage.findMany({
      where: {
        kind,
        deletedAt: null,
      },
      select: { id: true, formData: true, status: true },
    });
    let updated = 0;
    let skippedSigned = 0;
    let skippedManual = 0;
    for (const pkg of packages) {
      if (
        pkg.status === ContractDocumentPackageStatus.CONTRACT_CONCLUDED ||
        pkg.status === ContractDocumentPackageStatus.REFUSED
      ) {
        skippedSigned += 1;
        continue;
      }
      if (isWorkPeriodManualInFormData(pkg.formData)) {
        skippedManual += 1;
        continue;
      }
      const next = setWorkPeriodInFormData(pkg.formData, dto.workPeriodDays);
      await this.prisma.contractDocumentPackage.update({
        where: { id: pkg.id },
        data: { formData: next as Prisma.InputJsonValue },
      });
      updated += 1;
    }
    return {
      updated,
      skippedSigned,
      skippedManual,
      workPeriodDays: dto.workPeriodDays,
      kind,
    };
  }

  async applyRepairWorkPeriodToAllPackages(dto: ApplyRepairWorkPeriodToAllDto) {
    return this.applyWorkPeriodToAllPackages(ContractDocumentPackageKind.REPAIR, dto);
  }

  async applyWindowsWorkPeriodToAllPackages(dto: ApplyRepairWorkPeriodToAllDto) {
    return this.applyWorkPeriodToAllPackages(ContractDocumentPackageKind.WINDOWS, dto);
  }

  async resolveWorkOrderMarkupPercent(kind: ContractDocumentPackageKind): Promise<number> {
    if (!this.supportsWorkOrderMarkup(kind)) {
      return DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT;
    }
    try {
      const row = await this.prisma.contractDocumentRepairSettings.findUnique({
        where: { kind },
        select: { windowsWorkOrderMarkupPercent: true },
      });
      const raw = row?.windowsWorkOrderMarkupPercent ?? DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT;
      return Number.isFinite(raw) && raw >= 0 && raw <= 100
        ? Math.trunc(raw)
        : DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT;
    } catch {
      return DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT;
    }
  }

  /** @deprecated Используйте {@link resolveWorkOrderMarkupPercent} */
  async resolveWindowsWorkOrderMarkupPercent(): Promise<number> {
    return this.resolveWorkOrderMarkupPercent(ContractDocumentPackageKind.WINDOWS);
  }

  /** Стоимость одного угла в заказ-наряде потолков, ₽; null — не задана, строка «Углы» не добавляется. */
  private async resolveCeilingsWorkOrderCornerPrice(): Promise<number | null> {
    try {
      const row = await this.prisma.contractDocumentRepairSettings.findUnique({
        where: { kind: ContractDocumentPackageKind.CEILINGS },
        select: { ceilingsWorkOrderCornerPrice: true },
      });
      const raw = row?.ceilingsWorkOrderCornerPrice ?? null;
      return raw !== null && Number.isFinite(raw) && raw >= 0 ? Math.trunc(raw) : null;
    } catch {
      return null;
    }
  }

  async getWorkOrderMarkupSettings(kind: ContractDocumentPackageKind) {
    if (!this.supportsWorkOrderMarkup(kind)) {
      throw new BadRequestException(
        `Наценка заказ-наряда не поддерживается для направления ${kind}`,
      );
    }
    const windowsWorkOrderMarkupPercent = await this.resolveWorkOrderMarkupPercent(kind);
    const row = await this.prisma.contractDocumentRepairSettings.findUnique({
      where: { kind },
      select: { updatedAt: true },
    });
    return {
      kind,
      windowsWorkOrderMarkupPercent,
      ceilingsWorkOrderCornerPrice:
        kind === ContractDocumentPackageKind.CEILINGS
          ? await this.resolveCeilingsWorkOrderCornerPrice()
          : null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  async setWorkOrderMarkupSettings(
    kind: ContractDocumentPackageKind,
    dto: {
      windowsWorkOrderMarkupPercent: number;
      /** Только CEILINGS: null — сбросить (строка «Углы» не добавляется). */
      ceilingsWorkOrderCornerPrice?: number | null;
    },
    updatedById?: string,
  ) {
    if (!this.supportsWorkOrderMarkup(kind)) {
      throw new BadRequestException(
        `Наценка заказ-наряда не поддерживается для направления ${kind}`,
      );
    }
    if (
      kind !== ContractDocumentPackageKind.CEILINGS &&
      dto.ceilingsWorkOrderCornerPrice !== undefined
    ) {
      throw new BadRequestException(
        'Стоимость угла заказ-наряда поддерживается только для направления CEILINGS',
      );
    }
    const cornerPrice = dto.ceilingsWorkOrderCornerPrice;
    const fallbackDays = this.fallbackWorkPeriodDays(kind);
    const row = await this.prisma.contractDocumentRepairSettings.upsert({
      where: { kind },
      create: {
        kind,
        defaultWorkPeriodDays: fallbackDays,
        windowsWorkOrderMarkupPercent: dto.windowsWorkOrderMarkupPercent,
        ...(cornerPrice !== undefined ? { ceilingsWorkOrderCornerPrice: cornerPrice } : {}),
        updatedById: updatedById ?? null,
      },
      update: {
        windowsWorkOrderMarkupPercent: dto.windowsWorkOrderMarkupPercent,
        ...(cornerPrice !== undefined ? { ceilingsWorkOrderCornerPrice: cornerPrice } : {}),
        updatedById: updatedById ?? null,
      },
      select: {
        windowsWorkOrderMarkupPercent: true,
        ceilingsWorkOrderCornerPrice: true,
        updatedAt: true,
      },
    });
    return {
      kind,
      windowsWorkOrderMarkupPercent: row.windowsWorkOrderMarkupPercent,
      ceilingsWorkOrderCornerPrice:
        kind === ContractDocumentPackageKind.CEILINGS ? row.ceilingsWorkOrderCornerPrice : null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getWindowsWorkOrderMarkupSettings() {
    return this.getWorkOrderMarkupSettings(ContractDocumentPackageKind.WINDOWS);
  }

  async setWindowsWorkOrderMarkupSettings(dto: SetWindowsWorkOrderMarkupDto, updatedById?: string) {
    return this.setWorkOrderMarkupSettings(ContractDocumentPackageKind.WINDOWS, dto, updatedById);
  }

  /** Глобальные налог и наценка заказ-наряда по ремонту (null — не заданы, берутся из данных пакета). */
  async getRepairWorkOrderSettings() {
    const row = await this.prisma.contractDocumentRepairSettings.findUnique({
      where: { kind: ContractDocumentPackageKind.REPAIR },
      select: {
        repairWorkOrderMarkupPercent: true,
        repairWorkOrderTaxPercent: true,
        updatedAt: true,
      },
    });
    return {
      markupPercent: row?.repairWorkOrderMarkupPercent ?? null,
      taxPercent: row?.repairWorkOrderTaxPercent ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  async setRepairWorkOrderSettings(dto: SetRepairWorkOrderSettingsDto, updatedById?: string) {
    const kind = ContractDocumentPackageKind.REPAIR;
    const fallbackDays = this.fallbackWorkPeriodDays(kind);
    const row = await this.prisma.contractDocumentRepairSettings.upsert({
      where: { kind },
      create: {
        kind,
        defaultWorkPeriodDays: fallbackDays,
        repairWorkOrderMarkupPercent: dto.markupPercent,
        repairWorkOrderTaxPercent: dto.taxPercent,
        updatedById: updatedById ?? null,
      },
      update: {
        repairWorkOrderMarkupPercent: dto.markupPercent,
        repairWorkOrderTaxPercent: dto.taxPercent,
        updatedById: updatedById ?? null,
      },
      select: {
        repairWorkOrderMarkupPercent: true,
        repairWorkOrderTaxPercent: true,
        updatedAt: true,
      },
    });
    return {
      markupPercent: row.repairWorkOrderMarkupPercent,
      taxPercent: row.repairWorkOrderTaxPercent,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
