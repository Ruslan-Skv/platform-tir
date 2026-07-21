import { Injectable } from '@nestjs/common';
import { ContractDocumentPackageKind, ContractDocumentPackageStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  ApplyRepairWorkPeriodToAllDto,
  SetRepairContractSettingsDto,
} from './dto/set-repair-settings.dto';
import { SetWindowsWorkOrderMarkupDto } from './dto/set-windows-work-order-markup.dto';
import {
  DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_WINDOWS_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
  isWorkPeriodManualInFormData,
  setWorkPeriodInFormData,
} from './repair-contract-work-period';

@Injectable()
export class ContractDocumentPackageKindSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private fallbackWorkPeriodDays(kind: ContractDocumentPackageKind): number {
    return kind === ContractDocumentPackageKind.WINDOWS ||
      kind === ContractDocumentPackageKind.DOORS ||
      kind === ContractDocumentPackageKind.BLINDS
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
    if (
      kind === ContractDocumentPackageKind.WINDOWS ||
      kind === ContractDocumentPackageKind.DOORS ||
      kind === ContractDocumentPackageKind.BLINDS
    ) {
      return {
        ...base,
        windowsWorkOrderMarkupPercent: await this.resolveWindowsWorkOrderMarkupPercent(),
      };
    }
    return base;
  }

  async getRepairSettings() {
    return this.getWorkPeriodSettings(ContractDocumentPackageKind.REPAIR);
  }

  async getWindowsSettings() {
    return this.getWorkPeriodSettings(ContractDocumentPackageKind.WINDOWS);
  }

  async setWorkPeriodSettings(
    kind: ContractDocumentPackageKind,
    dto: SetRepairContractSettingsDto,
    updatedById?: string,
  ) {
    const row = await this.prisma.contractDocumentRepairSettings.upsert({
      where: { kind },
      create: {
        kind,
        defaultWorkPeriodDays: dto.defaultWorkPeriodDays,
        updatedById: updatedById ?? null,
      },
      update: {
        defaultWorkPeriodDays: dto.defaultWorkPeriodDays,
        updatedById: updatedById ?? null,
      },
      select: { defaultWorkPeriodDays: true, updatedAt: true },
    });
    return {
      kind,
      defaultWorkPeriodDays: row.defaultWorkPeriodDays,
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
      windowsWorkOrderMarkupPercent: await this.resolveWindowsWorkOrderMarkupPercent(),
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

  async resolveWindowsWorkOrderMarkupPercent(): Promise<number> {
    try {
      const row = await this.prisma.contractDocumentRepairSettings.findUnique({
        where: { kind: ContractDocumentPackageKind.WINDOWS },
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

  async getWindowsWorkOrderMarkupSettings() {
    const windowsWorkOrderMarkupPercent = await this.resolveWindowsWorkOrderMarkupPercent();
    const row = await this.prisma.contractDocumentRepairSettings.findUnique({
      where: { kind: ContractDocumentPackageKind.WINDOWS },
      select: { updatedAt: true },
    });
    return {
      windowsWorkOrderMarkupPercent,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  async setWindowsWorkOrderMarkupSettings(dto: SetWindowsWorkOrderMarkupDto, updatedById?: string) {
    const fallbackDays = this.fallbackWorkPeriodDays(ContractDocumentPackageKind.WINDOWS);
    const row = await this.prisma.contractDocumentRepairSettings.upsert({
      where: { kind: ContractDocumentPackageKind.WINDOWS },
      create: {
        kind: ContractDocumentPackageKind.WINDOWS,
        defaultWorkPeriodDays: fallbackDays,
        windowsWorkOrderMarkupPercent: dto.windowsWorkOrderMarkupPercent,
        updatedById: updatedById ?? null,
      },
      update: {
        windowsWorkOrderMarkupPercent: dto.windowsWorkOrderMarkupPercent,
        updatedById: updatedById ?? null,
      },
      select: { windowsWorkOrderMarkupPercent: true, updatedAt: true },
    });
    return {
      windowsWorkOrderMarkupPercent: row.windowsWorkOrderMarkupPercent,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
