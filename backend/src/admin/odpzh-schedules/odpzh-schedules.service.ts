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
  selectedInstallerIds,
} from '../installation-schedules/installation-schedule.shared';
import { addWorkingDaysExcludingWeekends } from '../repair-schedules/repair-schedule.shared';
import {
  ODPZH_SCHEDULE_KINDS,
  buildOdpzhDeadlineWarning,
  type OdpzhDeadlineWarningLevel,
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
  /** «Описание работ» из карточки договора (formData.object.objectDescription). */
  objectDescription: string | null;
  /** «Примечание» менеджера из карточки договора (formData.object.managerNote). */
  managerNote: string | null;
  contractSum: number | null;
  /** Дата договора (formData.contract.date, DD.MM.YYYY → ISO). */
  contractDate: string | null;
  /** Срок договора в рабочих днях (formData.contract.workPeriod). */
  workPeriodDays: number | null;
  /** Контрольная дата окончания договора: дата договора + срок (рабочие дни). */
  contractEndDate: string | null;
  /** Календарных дней до срока; < 0 — просрочен. */
  deadlineDaysLeft: number | null;
  deadlineWarning: OdpzhDeadlineWarningLevel | null;
  installerNames: string[];
  /** Ближайший запланированный монтаж (сегодня или позже). */
  nearestInstallationDate: string | null;
  /** Дата последнего монтажа по графику (dateEnd либо date). */
  lastInstallationDate: string | null;
  /** Сколько монтажей выполнено / всего. */
  installationsDoneCount: number;
  installationsTotalCount: number;
  /** Все монтажи графика выполнены (но договор ещё не закрыт по конвейеру). */
  allInstallationsDone: boolean;
  /** Дата последнего выполненного монтажа (completedAt ?? dateEnd ?? date). */
  lastCompletedInstallationDate: string | null;
  /**
   * Дата закрытия договора: дата акта сдачи либо (без отметки акта) дата
   * последней оплаты — закрытие = полная оплата + акт, берём более позднюю.
   */
  closedAt: string | null;
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
  completedAt: string | null;
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
      completedAt: true,
    },
    orderBy: { date: 'asc' as const },
  },
} satisfies Prisma.ContractDocumentPackageSelect;

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Дата закрытия: акт сдачи и оплаты — договор закрыт, когда есть оба, берём позднюю. */
function closedAtIsoDay(
  formData: Record<string, unknown>,
  payments: Array<{ paymentDate: Date | null }>,
): string | null {
  const days = [parseFlexibleDateOnly(formData.repairContractCloseActSignedAt)];
  for (const p of payments) {
    if (p.paymentDate) days.push(toIsoDay(p.paymentDate));
  }
  let max: string | null = null;
  for (const day of days) {
    if (day && (!max || day > max)) max = day;
  }
  return max;
}

function todayIsoDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function num(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number.parseFloat(raw.replace(/\s+/g, '').replace(',', '.'));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/** DD.MM.YYYY либо ISO → YYYY-MM-DD. */
function parseFlexibleDateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ru = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(t);
  if (ru) return `${ru[3]}-${ru[2]}-${ru[1]}`;
  return null;
}

/**
 * Данные договора/клиента из formData пакетов продуктовых направлений
 * (окна / двери / потолки / жалюзи): блоки contract / customer / object.
 */
function odpzhPackageSnapshot(formData: Record<string, unknown>): {
  contractNumber: string | null;
  contractDate: string | null;
  workPeriodDays: number | null;
  contractSum: number | null;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  objectDescription: string | null;
  managerNote: string | null;
} {
  const contract = asObj(formData.contract);
  const customer = asObj(formData.customer);
  const object = asObj(formData.object);

  const customerType = customer?.type;
  const customerName =
    customerType === 'COMPANY' || customerType === 'ENTREPRENEUR'
      ? str(customer?.organizationName)
      : str(customer?.fullName);
  const phone = str(customer?.phone) ?? firstPhone(customer?.phones);
  const address = str(customer?.address) ?? str(object?.objectAddress) ?? str(object?.address);

  const workPeriodRaw = contract?.workPeriod;
  const workPeriodDays =
    typeof workPeriodRaw === 'number' && Number.isFinite(workPeriodRaw)
      ? Math.trunc(workPeriodRaw)
      : typeof workPeriodRaw === 'string' && /^\d+$/.test(workPeriodRaw.trim())
        ? parseInt(workPeriodRaw.trim(), 10)
        : null;

  return {
    contractNumber: str(contract?.number),
    contractDate: parseFlexibleDateOnly(contract?.date),
    workPeriodDays: workPeriodDays != null && workPeriodDays >= 1 ? workPeriodDays : null,
    contractSum:
      num(contract?.totalAmount) ??
      num(asObj(formData.estimate)?.total) ??
      num(asObj(asObj(formData.estimate)?.snapshot)?.total) ??
      num(formData.productSpecificationAmount),
    customerName,
    customerAddress: address,
    customerPhone: phone,
    objectDescription: str(object?.objectDescription),
    managerNote: str(object?.managerNote),
  };
}

function firstPhone(raw: unknown): string | null {
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const s = str(item);
      if (s) return s;
    }
    return null;
  }
  return str(raw);
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
       * В продуктовых направлениях нет акта начала работ: «В работе» = есть записи
       * в графике монтажей. Все монтажи выполнены — отдельный раздел до закрытия
       * договора по конвейеру (акт сдачи + полная оплата).
       */
      const status: OdpzhScheduleStatus =
        pipeline === 'CLOSED'
          ? 'CLOSED'
          : entries.length > 0 && entries.every((e) => e.status === InstallationScheduleStatus.DONE)
            ? 'INSTALLATIONS_DONE'
            : entries.length > 0
              ? 'IN_PROGRESS'
              : 'NEW';
      if (params.status && params.status !== status) continue;
      if (params.direction && params.direction !== pkg.kind) continue;

      const today = todayIsoDay();
      let nearestInstallationDate: string | null = null;
      let lastInstallationDate: string | null = null;
      let installationsDoneCount = 0;
      let lastCompletedInstallationDate: string | null = null;
      const installerNames = new Set<string>();
      for (const entry of entries) {
        if (entry.status === InstallationScheduleStatus.DONE) {
          installationsDoneCount++;
          const completedDay = toIsoDay(entry.completedAt ?? entry.dateEnd ?? entry.date);
          if (!lastCompletedInstallationDate || completedDay > lastCompletedInstallationDate) {
            lastCompletedInstallationDate = completedDay;
          }
        }
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

      const snapshot = odpzhPackageSnapshot(formData);
      // Контрольная дата: дата договора + срок в рабочих днях (как «Срок дог.» в договорах).
      const contractEndDate =
        snapshot.contractDate && snapshot.workPeriodDays != null
          ? addWorkingDaysExcludingWeekends(snapshot.contractDate, snapshot.workPeriodDays)
          : null;
      const { deadlineDaysLeft, deadlineWarning } = buildOdpzhDeadlineWarning({
        contractEndDate,
        status,
      });

      rows.push({
        id: pkg.id,
        contractNumber: snapshot.contractNumber,
        kind: pkg.kind as OdpzhScheduleKind,
        status,
        customerName: snapshot.customerName,
        customerAddress: snapshot.customerAddress,
        customerPhone: snapshot.customerPhone,
        objectDescription: snapshot.objectDescription,
        managerNote: snapshot.managerNote,
        contractSum: snapshot.contractSum,
        contractDate: snapshot.contractDate,
        workPeriodDays: snapshot.workPeriodDays,
        contractEndDate,
        deadlineDaysLeft,
        deadlineWarning,
        installerNames: [...installerNames],
        nearestInstallationDate,
        lastInstallationDate,
        installationsDoneCount,
        installationsTotalCount: entries.length,
        allInstallationsDone:
          entries.length > 0 && entries.every((e) => e.status === InstallationScheduleStatus.DONE),
        lastCompletedInstallationDate,
        closedAt: status === 'CLOSED' ? closedAtIsoDay(formData, pkg.payments) : null,
        entriesCount: entries.length,
        entries: entries.map((entry) => ({
          id: entry.id,
          date: toIsoDay(entry.date),
          dateEnd: entry.dateEnd ? toIsoDay(entry.dateEnd) : null,
          direction: entry.direction,
          status: entry.status,
          installerName: entry.installerName,
          workOrderKey: entry.workOrderKey,
          completedAt: entry.completedAt ? entry.completedAt.toISOString() : null,
        })),
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
      });
    }

    rows.sort((a, b) => {
      if (a.status !== b.status) {
        const rank = { NEW: 0, IN_PROGRESS: 1, INSTALLATIONS_DONE: 2, CLOSED: 3 } as const;
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
