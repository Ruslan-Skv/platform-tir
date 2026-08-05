import { Injectable } from '@nestjs/common';
import {
  FurnitureScheduleProjectStatus,
  InstallationScheduleStatus,
  Prisma,
  RepairScheduleProjectStatus,
  WaybillTaskStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeContractDocumentObjectAddress } from '../contract-document-objects/contract-document-object-address';
import { withDerived as withFurnitureDerived } from '../furniture-schedules/furniture-schedule.shared';
import { withDerived as withRepairDerived } from '../repair-schedules/repair-schedule.shared';

/** Направления, считающиеся «разными» для фильтра «совместный объект». */
export type JointDirection = 'WINDOWS' | 'DOORS' | 'CEILINGS' | 'BLINDS' | 'REPAIR' | 'FURNITURE';

export type JointItemKind = 'installation' | 'repair' | 'furniture' | 'waybill';

export type JointTimelineItem = {
  id: string;
  kind: JointItemKind;
  direction: JointDirection | 'DELIVERY';
  directionLabel: string;
  title: string;
  status: string;
  statusLabel: string;
  customerName: string | null;
  customerAddress: string | null;
  contractNumber: string | null;
  assigneeName: string | null;
  /** YYYY-MM-DD — начало полосы или точка события */
  startDate: string | null;
  /** YYYY-MM-DD — конец полосы; для точек = startDate */
  endDate: string | null;
  isPoint: boolean;
  href: string;
  note: string | null;
  contractSum: string | number | null;
  deadlineWarning: 'D20' | 'D10' | 'D3' | 'OVERDUE' | null;
  packageId: string | null;
  contractId: string | null;
};

export type JointObjectCluster = {
  id: string;
  label: string;
  customerNames: string[];
  addresses: string[];
  directions: JointDirection[];
  directionLabels: string[];
  itemCount: number;
  deliveryCount: number;
  activeCount: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  items: JointTimelineItem[];
};

export type JointObjectsListResult = {
  objects: JointObjectCluster[];
  totalObjects: number;
  totalItems: number;
  meta: {
    installFrom: string;
    installTo: string;
    waybillFrom: string;
    waybillTo: string;
    includeClosed: boolean;
  };
};

const DIRECTION_LABELS: Record<JointDirection | 'DELIVERY', string> = {
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Потолки',
  BLINDS: 'Жалюзи',
  REPAIR: 'Ремонт',
  FURNITURE: 'Мебель',
  DELIVERY: 'Доставка',
};

const INSTALL_STATUS_LABELS: Record<InstallationScheduleStatus, string> = {
  PLANNED: 'Запланирован',
  DONE: 'Выполнен',
  FAILED: 'Срыв',
};

const WAYBILL_STATUS_LABELS: Record<WaybillTaskStatus, string> = {
  PLANNED: 'Запланирована',
  DONE: 'Доставлено',
  FAILED: 'Срыв',
};

const REPAIR_STATUS_LABELS: Record<RepairScheduleProjectStatus, string> = {
  NEW: 'Новые',
  IN_PROGRESS: 'В работе',
  CLOSED: 'Закрытые',
};

const FURNITURE_STATUS_LABELS: Record<FurnitureScheduleProjectStatus, string> = {
  NEW: 'На очереди',
  IN_PROGRESS: 'В работе',
  CLAIMS: 'Рекламации',
  CLOSED: 'Закрытые',
};

type RawNode = {
  item: JointTimelineItem;
  addressKey: string;
  customerKey: string;
  documentObjectId: string | null;
  packageId: string | null;
  contractId: string | null;
};

function dateToIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

function normalizeAddress(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  return normalizeContractDocumentObjectAddress(value);
}

function uniqueDisplay(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const display = (raw ?? '').trim();
    if (!display) continue;
    const key = normalizeName(display);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(display);
  }
  return out;
}

function asInstallDirection(raw: string): JointDirection | null {
  const d = raw.trim().toUpperCase();
  if (d === 'WINDOWS' || d === 'DOORS' || d === 'CEILINGS' || d === 'BLINDS') return d;
  // FURNITURE в графике монтажей тоже бывает — считаем мебелью
  if (d === 'FURNITURE') return 'FURNITURE';
  return null;
}

function defaultRange(daysBack: number, daysForward: number) {
  const today = new Date();
  const from = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  from.setUTCDate(from.getUTCDate() - daysBack);
  const to = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  to.setUTCDate(to.getUTCDate() + daysForward);
  return { from, to, fromIso: dateToIso(from)!, toIso: dateToIso(to)! };
}

function moneyOrNull(value: Prisma.Decimal | number | null | undefined): string | number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  return value.toString();
}

@Injectable()
export class JointObjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    search?: string;
    includeClosed?: boolean;
    installFrom?: string;
    installTo?: string;
    waybillFrom?: string;
    waybillTo?: string;
  }): Promise<JointObjectsListResult> {
    const includeClosed = Boolean(params.includeClosed);
    const installDefault = defaultRange(120, 180);
    const waybillDefault = defaultRange(60, 90);

    const installFrom = parseIsoDate(params.installFrom) ?? parseIsoDate(installDefault.fromIso)!;
    const installTo = parseIsoDate(params.installTo) ?? parseIsoDate(installDefault.toIso)!;
    const waybillFrom = parseIsoDate(params.waybillFrom) ?? parseIsoDate(waybillDefault.fromIso)!;
    const waybillTo = parseIsoDate(params.waybillTo) ?? parseIsoDate(waybillDefault.toIso)!;

    const [installs, repairs, furniture, waybills] = await Promise.all([
      this.prisma.installationScheduleEntry.findMany({
        where: {
          deletedAt: null,
          date: { gte: installFrom, lte: installTo },
        },
        select: {
          id: true,
          direction: true,
          date: true,
          timeFrom: true,
          timeTo: true,
          status: true,
          customerName: true,
          customerAddress: true,
          contractNumber: true,
          installerName: true,
          packageId: true,
          contractId: true,
          note: true,
          package: { select: { documentObjectId: true } },
        },
        orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }],
        take: 5000,
      }),
      this.prisma.repairScheduleProject.findMany({
        where: includeClosed ? undefined : { status: { not: RepairScheduleProjectStatus.CLOSED } },
        include: {
          package: {
            select: {
              documentObjectId: true,
              formData: true,
              crmContract: {
                select: {
                  actWorkStartDate: true,
                  actWorkEndDate: true,
                  contractDurationDays: true,
                },
              },
            },
          },
          contract: {
            select: {
              actWorkStartDate: true,
              actWorkEndDate: true,
              contractDurationDays: true,
            },
          },
          entries: {
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            take: 1,
            select: { id: true, date: true, text: true, kind: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 3000,
      }),
      this.prisma.furnitureScheduleProject.findMany({
        where: includeClosed
          ? undefined
          : { status: { not: FurnitureScheduleProjectStatus.CLOSED } },
        include: {
          package: {
            select: {
              documentObjectId: true,
              formData: true,
              crmContract: {
                select: {
                  actWorkStartDate: true,
                  actWorkEndDate: true,
                  contractDurationDays: true,
                },
              },
            },
          },
          contract: {
            select: {
              actWorkStartDate: true,
              actWorkEndDate: true,
              contractDurationDays: true,
            },
          },
          entries: {
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            take: 1,
            select: { id: true, date: true, text: true, kind: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 3000,
      }),
      this.prisma.waybillTask.findMany({
        where: {
          deletedAt: null,
          date: { gte: waybillFrom, lte: waybillTo },
        },
        select: {
          id: true,
          date: true,
          timeFrom: true,
          timeTo: true,
          status: true,
          taskText: true,
          customerName: true,
          customerAddress: true,
          direction: true,
          contractId: true,
        },
        orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }],
        take: 5000,
      }),
    ]);

    const nodes: RawNode[] = [];

    for (const row of installs) {
      const direction = asInstallDirection(row.direction);
      if (!direction) continue;
      const startDate = dateToIso(row.date);
      const time =
        row.timeFrom || row.timeTo ? [row.timeFrom, row.timeTo].filter(Boolean).join('–') : null;
      nodes.push({
        addressKey: normalizeAddress(row.customerAddress),
        customerKey: normalizeName(row.customerName),
        documentObjectId: row.package?.documentObjectId ?? null,
        packageId: row.packageId,
        contractId: row.contractId,
        item: {
          id: row.id,
          kind: 'installation',
          direction,
          directionLabel: DIRECTION_LABELS[direction],
          title: row.contractNumber?.trim() || DIRECTION_LABELS[direction],
          status: row.status,
          statusLabel: INSTALL_STATUS_LABELS[row.status],
          customerName: row.customerName,
          customerAddress: row.customerAddress,
          contractNumber: row.contractNumber,
          assigneeName: row.installerName,
          startDate,
          endDate: startDate,
          isPoint: true,
          href: `/admin/crm/installation-schedules?date=${startDate ?? ''}&direction=${direction}`,
          note: [time, row.note].filter(Boolean).join(' · ') || null,
          contractSum: null,
          deadlineWarning: null,
          packageId: row.packageId,
          contractId: row.contractId,
        },
      });
    }

    for (const row of repairs) {
      const derived = withRepairDerived(row);
      const startDate =
        derived.workStartActDate ?? dateToIso(row.plannedStartDate) ?? dateToIso(row.createdAt);
      const endDate = derived.calculatedEndDate ?? dateToIso(row.workCloseActDate) ?? startDate;
      nodes.push({
        addressKey: normalizeAddress(row.customerAddress),
        customerKey: normalizeName(row.customerName),
        documentObjectId: row.package?.documentObjectId ?? null,
        packageId: row.packageId,
        contractId: row.contractId,
        item: {
          id: row.id,
          kind: 'repair',
          direction: 'REPAIR',
          directionLabel: DIRECTION_LABELS.REPAIR,
          title: row.contractNumber?.trim() || row.workScope?.trim() || 'Ремонт',
          status: row.status,
          statusLabel: REPAIR_STATUS_LABELS[row.status],
          customerName: row.customerName,
          customerAddress: row.customerAddress,
          contractNumber: row.contractNumber,
          assigneeName: row.installerName,
          startDate,
          endDate,
          isPoint: false,
          href: `/admin/crm/repair-schedules/${row.id}`,
          note: derived.latestEntry?.text?.slice(0, 120) ?? row.note,
          contractSum: moneyOrNull(row.contractSum),
          deadlineWarning: derived.deadlineWarning ?? null,
          packageId: row.packageId,
          contractId: row.contractId,
        },
      });
    }

    for (const row of furniture) {
      const derived = withFurnitureDerived(row);
      const startDate =
        derived.workStartActDate ??
        dateToIso(row.plannedStartDate) ??
        dateToIso(row.contractDate) ??
        dateToIso(row.createdAt);
      const endDate = derived.calculatedEndDate ?? dateToIso(row.workCloseActDate) ?? startDate;
      const numbers = [
        row.contractNumber,
        row.installationContractNumber,
        row.appliancesContractNumber,
      ]
        .map((v) => v?.trim())
        .filter(Boolean);
      nodes.push({
        addressKey: normalizeAddress(row.customerAddress),
        customerKey: normalizeName(row.customerName),
        documentObjectId: row.package?.documentObjectId ?? null,
        packageId: row.packageId,
        contractId: row.contractId,
        item: {
          id: row.id,
          kind: 'furniture',
          direction: 'FURNITURE',
          directionLabel: DIRECTION_LABELS.FURNITURE,
          title: numbers[0] || 'Мебель',
          status: row.status,
          statusLabel: FURNITURE_STATUS_LABELS[row.status],
          customerName: row.customerName,
          customerAddress: row.customerAddress,
          contractNumber: numbers.join(' · ') || null,
          assigneeName: row.installerName,
          startDate,
          endDate,
          isPoint: false,
          href: `/admin/crm/furniture-schedules/${row.id}`,
          note: derived.latestEntry?.text?.slice(0, 120) ?? row.note,
          contractSum: moneyOrNull(row.contractSum),
          deadlineWarning: derived.deadlineWarning ?? null,
          packageId: row.packageId,
          contractId: row.contractId,
        },
      });
    }

    for (const row of waybills) {
      const startDate = dateToIso(row.date);
      const time =
        row.timeFrom || row.timeTo ? [row.timeFrom, row.timeTo].filter(Boolean).join('–') : null;
      nodes.push({
        addressKey: normalizeAddress(row.customerAddress),
        customerKey: normalizeName(row.customerName),
        documentObjectId: null,
        packageId: null,
        contractId: row.contractId,
        item: {
          id: row.id,
          kind: 'waybill',
          direction: 'DELIVERY',
          directionLabel: DIRECTION_LABELS.DELIVERY,
          title: row.taskText?.trim().slice(0, 80) || 'Доставка',
          status: row.status,
          statusLabel: WAYBILL_STATUS_LABELS[row.status],
          customerName: row.customerName,
          customerAddress: row.customerAddress,
          contractNumber: null,
          assigneeName: null,
          startDate,
          endDate: startDate,
          isPoint: true,
          href: `/admin/crm/waybills?date=${startDate ?? ''}`,
          note: time,
          contractSum: null,
          deadlineWarning: null,
          packageId: null,
          contractId: row.contractId,
        },
      });
    }

    const clusters = this.clusterNodes(nodes).filter((c) => c.directions.length >= 2);

    const search = params.search?.trim().toLowerCase();
    const filtered = search
      ? clusters.filter((c) => {
          const hay = [
            c.label,
            ...c.customerNames,
            ...c.addresses,
            ...c.directionLabels,
            ...c.items.map((i) =>
              [i.title, i.contractNumber, i.assigneeName, i.note].filter(Boolean).join(' '),
            ),
          ]
            .join(' ')
            .toLowerCase();
          return hay.includes(search);
        })
      : clusters;

    filtered.sort((a, b) => {
      const ae = a.rangeEnd ?? '';
      const be = b.rangeEnd ?? '';
      if (ae !== be) return ae < be ? -1 : 1;
      return a.label.localeCompare(b.label, 'ru');
    });

    return {
      objects: filtered,
      totalObjects: filtered.length,
      totalItems: filtered.reduce((sum, o) => sum + o.itemCount, 0),
      meta: {
        installFrom: dateToIso(installFrom)!,
        installTo: dateToIso(installTo)!,
        waybillFrom: dateToIso(waybillFrom)!,
        waybillTo: dateToIso(waybillTo)!,
        includeClosed,
      },
    };
  }

  private clusterNodes(nodes: RawNode[]): JointObjectCluster[] {
    const n = nodes.length;
    if (n === 0) return [];

    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (i: number): number => {
      let x = i;
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };

    const byAddress = new Map<string, number>();
    const byCustomer = new Map<string, number>();
    const byDocObject = new Map<string, number>();
    const byPackage = new Map<string, number>();
    const byContract = new Map<string, number>();

    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      if (node.addressKey) {
        const prev = byAddress.get(node.addressKey);
        if (prev !== undefined) union(i, prev);
        else byAddress.set(node.addressKey, i);
      }
      if (node.customerKey) {
        const prev = byCustomer.get(node.customerKey);
        if (prev !== undefined) union(i, prev);
        else byCustomer.set(node.customerKey, i);
      }
      if (node.documentObjectId) {
        const prev = byDocObject.get(node.documentObjectId);
        if (prev !== undefined) union(i, prev);
        else byDocObject.set(node.documentObjectId, i);
      }
      if (node.packageId) {
        const prev = byPackage.get(node.packageId);
        if (prev !== undefined) union(i, prev);
        else byPackage.set(node.packageId, i);
      }
      if (node.contractId) {
        const prev = byContract.get(node.contractId);
        if (prev !== undefined) union(i, prev);
        else byContract.set(node.contractId, i);
      }
    }

    const buckets = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      const list = buckets.get(root);
      if (list) list.push(i);
      else buckets.set(root, [i]);
    }

    const clusters: JointObjectCluster[] = [];
    for (const indices of buckets.values()) {
      const members = indices.map((i) => nodes[i]);
      const items = members.map((m) => m.item);
      const directionSet = new Set<JointDirection>();
      for (const item of items) {
        if (item.direction !== 'DELIVERY') directionSet.add(item.direction);
      }
      const directions = [...directionSet];
      const addresses = uniqueDisplay(items.map((i) => i.customerAddress));
      const customerNames = uniqueDisplay(items.map((i) => i.customerName));
      const label = addresses[0] || customerNames[0] || items[0]?.title || items[0]?.id || 'Объект';

      const dates = items
        .flatMap((i) => [i.startDate, i.endDate])
        .filter((d): d is string => Boolean(d))
        .sort();
      const activeCount = items.filter((i) => {
        if (i.kind === 'repair' || i.kind === 'furniture') {
          return i.status !== 'CLOSED';
        }
        return (
          i.status === 'PLANNED' ||
          i.status === 'IN_PROGRESS' ||
          i.status === 'NEW' ||
          i.status === 'CLAIMS'
        );
      }).length;

      const idSeed = [
        ...addresses.map((a) => `a:${normalizeAddress(a)}`),
        ...customerNames.map((c) => `c:${normalizeName(c)}`),
        ...items.map((i) => `${i.kind}:${i.id}`),
      ].join('|');

      // Стабильный порядок элементов: направление → дата
      const dirOrder: Record<string, number> = {
        REPAIR: 0,
        FURNITURE: 1,
        WINDOWS: 2,
        DOORS: 3,
        CEILINGS: 4,
        BLINDS: 5,
        DELIVERY: 6,
      };
      items.sort((a, b) => {
        const da = dirOrder[a.direction] ?? 99;
        const db = dirOrder[b.direction] ?? 99;
        if (da !== db) return da - db;
        return (a.startDate ?? '').localeCompare(b.startDate ?? '');
      });

      clusters.push({
        id: Buffer.from(idSeed).toString('base64url').slice(0, 48),
        label,
        customerNames,
        addresses,
        directions,
        directionLabels: directions.map((d) => DIRECTION_LABELS[d]),
        itemCount: items.length,
        deliveryCount: items.filter((i) => i.kind === 'waybill').length,
        activeCount,
        rangeStart: dates[0] ?? null,
        rangeEnd: dates[dates.length - 1] ?? null,
        items,
      });
    }

    return clusters;
  }
}
