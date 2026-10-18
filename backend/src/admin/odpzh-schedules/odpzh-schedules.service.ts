import { Injectable } from '@nestjs/common';
import { ContractDocumentPackageStatus, InstallationScheduleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  computePackageListPipelineStatus,
  type PackageListPaymentRow,
  packageMatchesListSearch,
} from '../contract-document-packages/list-pipeline/package-list-pipeline-status';
import {
  asFormDataRecord,
  customerFromFormData,
  selectedInstallerIds,
} from '../installation-schedules/installation-schedule.shared';
import {
  ODPZH_SCHEDULE_KINDS,
  type OdpzhScheduleKind,
  type OdpzhScheduleStatus,
} from './odpzh-schedule.shared';

export type OdpzhScheduleRow = {
  id: string;
  contractNumber: string | null;
  kind: OdpzhScheduleKind;
  status: OdpzhScheduleStatus;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  contractSum: number | null;
  installerNames: string[];
  /** Ближайший запланированный монтаж (сегодня или позже). */
  nearestInstallationDate: string | null;
  /** Дата последнего монтажа по графику (dateEnd либо date). */
  lastInstallationDate: string | null;
  entriesCount: number;
  /** Записи графика монтажей пакета (для таймлайна). */
  entries: OdpzhScheduleEntryRow[];
  createdAt: Date;
  updatedAt: Date;
};

export type OdpzhScheduleEntryRow = {
  id: string;
  date: string;
  dateEnd: string | null;
  direction: string;
  status: 'PLANNED' | 'DONE' | 'FAILED';
  installerName: string | null;
  workOrderKey: string | null;
};

/** Пакеты ОДПЖ со всем, что нужно для строк план-графика. */
const ODPZH_PACKAGE_SELECT = {
  id: true,
  kind: true,
  status: true,
  formData: true,
  createdAt: true,
  updatedAt: true,
  payments: {
    select: { amount: true, paymentType: true, addendumNumber: true, paymentDate: true },
  },
  installationSchedules: {
    where: { deletedAt: null },
    select: {
      id: true,
      date: true,
      dateEnd: true,
      direction: true,
      status: true,
      installerName: true,
      installerIds: true,
      workOrderKey: true,
    },
    orderBy: { date: 'asc' as const },
  },
} satisfies Prisma.ContractDocumentPackageSelect;

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayIsoDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Сумма договора из formData (contract.totalAmount либо расчёт продуктовых направлений). */
function contractSumFromFormData(formData: Record<string, unknown>): number | null {
  const asObj = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  const num = (raw: unknown): number | null => {
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      const n = Number.parseFloat(raw.replace(/\s+/g, '').replace(',', '.'));
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return null;
  };

  const contract = asObj(formData.contract);
  const fromContract = num(contract?.totalAmount);
  if (fromContract != null) return fromContract;

  const estimate = asObj(formData.estimate);
  const fromEstimate = num(asObj(estimate?.snapshot)?.total);
  if (fromEstimate != null) return fromEstimate;

  return num(formData.productSpecificationAmount);
}

/**
 * План-график ОДПЖ: договоры направлений «Окна / Двери / Потолки / Жалюзи»
 * со статусом «Договор подписан», сгруппированные по стадии работы с графиком монтажей.
 * Ничего не хранит — статус считается на лету по пакету и записям графика монтажей.
 */
@Injectable()
export class OdpzhSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    status?: OdpzhScheduleStatus;
    direction?: OdpzhScheduleKind;
    search?: string;
  }): Promise<OdpzhScheduleRow[]> {
    const searchNorm = params.search?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';

    const packages = await this.prisma.contractDocumentPackage.findMany({
      where: {
        kind: { in: [...ODPZH_SCHEDULE_KINDS] },
        status: ContractDocumentPackageStatus.CONTRACT_CONCLUDED,
        deletedAt: null,
      },
      select: ODPZH_PACKAGE_SELECT,
      orderBy: { createdAt: 'asc' },
    });

    // Имена монтажников из записей графика и заказ-нарядов пакета.
    const installerIds = new Set<string>();
    for (const pkg of packages) {
      for (const entry of pkg.installationSchedules) {
        for (const id of entry.installerIds) installerIds.add(id);
      }
      for (const id of selectedInstallerIds(asFormDataRecord(pkg.formData))) {
        installerIds.add(id);
      }
    }
    const installerNamesById = new Map<string, string>();
    if (installerIds.size > 0) {
      const masters = await this.prisma.installerMaster.findMany({
        where: { id: { in: [...installerIds] } },
        select: { id: true, fullName: true },
      });
      for (const master of masters) installerNamesById.set(master.id, master.fullName);
    }

    const rows: OdpzhScheduleRow[] = [];
    for (const pkg of packages) {
      const formData = asFormDataRecord(pkg.formData);
      if (searchNorm && !packageMatchesListSearch(pkg.formData, searchNorm)) continue;

      const payments: PackageListPaymentRow[] = pkg.payments.map((p) => ({
        amount: p.amount.toString(),
        paymentType: p.paymentType,
        addendumNumber: p.addendumNumber,
        paymentDate: p.paymentDate,
      }));
      const pipeline = computePackageListPipelineStatus({
        kind: pkg.kind,
        status: pkg.status,
        formData: pkg.formData,
        payments,
      });

      const entries = pkg.installationSchedules;
      /*
       * В продуктовых направлениях нет акта начала работ:
       * «В работе» = есть хотя бы одна запись в графике монтажей.
       */
      const status: OdpzhScheduleStatus =
        pipeline === 'CLOSED' ? 'CLOSED' : entries.length > 0 ? 'IN_PROGRESS' : 'NEW';
      if (params.status && params.status !== status) continue;
      if (params.direction && params.direction !== pkg.kind) continue;

      const today = todayIsoDay();
      let nearestInstallationDate: string | null = null;
      let lastInstallationDate: string | null = null;
      const installerNames = new Set<string>();
      for (const entry of entries) {
        if (
          entry.status === InstallationScheduleStatus.PLANNED &&
          toIsoDay(entry.date) >= today &&
          !nearestInstallationDate
        ) {
          nearestInstallationDate = toIsoDay(entry.date);
        }
        const lastDay = toIsoDay(entry.dateEnd ?? entry.date);
        if (!lastInstallationDate || lastDay > lastInstallationDate) {
          lastInstallationDate = lastDay;
        }
        for (const part of (entry.installerName ?? '').split(',')) {
          const name = part.trim();
          if (name) installerNames.add(name);
        }
        for (const id of entry.installerIds) {
          const name = installerNamesById.get(id);
          if (name) installerNames.add(name);
        }
      }
      if (installerNames.size === 0) {
        for (const id of selectedInstallerIds(formData)) {
          const name = installerNamesById.get(id);
          if (name) installerNames.add(name);
        }
      }

      const customer = customerFromFormData(formData);
      rows.push({
        id: pkg.id,
        contractNumber: customer.contractNumber,
        kind: pkg.kind as OdpzhScheduleKind,
        status,
        customerName: customer.customerName,
        customerAddress: customer.customerAddress,
        customerPhone: customer.customerPhone,
        contractSum: contractSumFromFormData(formData),
        installerNames: [...installerNames],
        nearestInstallationDate,
        lastInstallationDate,
        entriesCount: entries.length,
        entries: entries.map((entry) => ({
          id: entry.id,
          date: toIsoDay(entry.date),
          dateEnd: entry.dateEnd ? toIsoDay(entry.dateEnd) : null,
          direction: entry.direction,
          status: entry.status,
          installerName: entry.installerName,
          workOrderKey: entry.workOrderKey,
        })),
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
      });
    }

    rows.sort((a, b) => {
      if (a.status !== b.status) {
        const rank = { NEW: 0, IN_PROGRESS: 1, CLOSED: 2 } as const;
        return rank[a.status] - rank[b.status];
      }
      if (a.status === 'CLOSED') return b.updatedAt.getTime() - a.updatedAt.getTime();
      const da = a.nearestInstallationDate ?? a.createdAt.toISOString();
      const db = b.nearestInstallationDate ?? b.createdAt.toISOString();
      return da.localeCompare(db);
    });

    return rows;
  }
}
