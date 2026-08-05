import {
  FurnitureScheduleProjectStatus,
  InstallationScheduleStatus,
  Prisma,
  RepairScheduleProjectStatus,
  WaybillTaskStatus,
} from '@prisma/client';
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

export type JointRawNode = {
  item: JointTimelineItem;
  addressKey: string;
  customerKey: string;
  documentObjectId: string | null;
  packageId: string | null;
  contractId: string | null;
};

export const DIRECTION_LABELS: Record<JointDirection | 'DELIVERY', string> = {
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

const DIR_ORDER: Record<string, number> = {
  REPAIR: 0,
  FURNITURE: 1,
  WINDOWS: 2,
  DOORS: 3,
  CEILINGS: 4,
  BLINDS: 5,
  DELIVERY: 6,
};

export function dateToIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function normalizeName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

export function normalizeAddress(value: string | null | undefined): string {
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

export function asInstallDirection(raw: string): JointDirection | null {
  const d = raw.trim().toUpperCase();
  if (d === 'WINDOWS' || d === 'DOORS' || d === 'CEILINGS' || d === 'BLINDS') return d;
  if (d === 'FURNITURE') return 'FURNITURE';
  return null;
}

export function defaultRange(daysBack: number, daysForward: number) {
  const today = new Date();
  const from = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  from.setUTCDate(from.getUTCDate() - daysBack);
  const to = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  to.setUTCDate(to.getUTCDate() + daysForward);
  return { from, to, fromIso: dateToIso(from)!, toIso: dateToIso(to)! };
}

export function moneyOrNull(
  value: Prisma.Decimal | number | null | undefined,
): string | number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  return value.toString();
}

function nodeKeys(input: {
  customerName: string | null;
  customerAddress: string | null;
  documentObjectId?: string | null;
  packageId: string | null;
  contractId: string | null;
}): Omit<JointRawNode, 'item'> {
  return {
    addressKey: normalizeAddress(input.customerAddress),
    customerKey: normalizeName(input.customerName),
    documentObjectId: input.documentObjectId ?? null,
    packageId: input.packageId,
    contractId: input.contractId,
  };
}

export function installationToNode(row: {
  id: string;
  direction: string;
  date: Date;
  timeFrom: string | null;
  timeTo: string | null;
  status: InstallationScheduleStatus;
  customerName: string | null;
  customerAddress: string | null;
  contractNumber: string | null;
  installerName: string | null;
  packageId: string | null;
  contractId: string | null;
  note: string | null;
  package?: { documentObjectId: string | null } | null;
}): JointRawNode | null {
  const direction = asInstallDirection(row.direction);
  if (!direction) return null;
  const startDate = dateToIso(row.date);
  const time =
    row.timeFrom || row.timeTo ? [row.timeFrom, row.timeTo].filter(Boolean).join('–') : null;
  return {
    ...nodeKeys({
      customerName: row.customerName,
      customerAddress: row.customerAddress,
      documentObjectId: row.package?.documentObjectId,
      packageId: row.packageId,
      contractId: row.contractId,
    }),
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
  };
}

export function repairToNode(
  row: Parameters<typeof withRepairDerived>[0] & {
    id: string;
    contractNumber: string | null;
    workScope: string | null;
    customerName: string | null;
    customerAddress: string | null;
    installerName: string | null;
    packageId: string | null;
    contractId: string | null;
    plannedStartDate: Date | null;
    workCloseActDate: Date | null;
    createdAt: Date;
    note: string | null;
    contractSum: Prisma.Decimal | null;
    package?: { documentObjectId?: string | null } | null;
  },
): JointRawNode {
  const derived = withRepairDerived(row);
  const startDate =
    derived.workStartActDate ?? dateToIso(row.plannedStartDate) ?? dateToIso(row.createdAt);
  const endDate = derived.calculatedEndDate ?? dateToIso(row.workCloseActDate) ?? startDate;
  return {
    ...nodeKeys({
      customerName: row.customerName,
      customerAddress: row.customerAddress,
      documentObjectId: row.package?.documentObjectId ?? null,
      packageId: row.packageId,
      contractId: row.contractId,
    }),
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
  };
}

export function furnitureToNode(
  row: Parameters<typeof withFurnitureDerived>[0] & {
    id: string;
    contractNumber: string | null;
    installationContractNumber: string | null;
    appliancesContractNumber: string | null;
    customerName: string | null;
    customerAddress: string | null;
    installerName: string | null;
    packageId: string | null;
    contractId: string | null;
    plannedStartDate: Date | null;
    contractDate: Date | null;
    workCloseActDate: Date | null;
    createdAt: Date;
    note: string | null;
    contractSum: Prisma.Decimal | null;
    package?: { documentObjectId?: string | null } | null;
  },
): JointRawNode {
  const derived = withFurnitureDerived(row);
  const startDate =
    derived.workStartActDate ??
    dateToIso(row.plannedStartDate) ??
    dateToIso(row.contractDate) ??
    dateToIso(row.createdAt);
  const endDate = derived.calculatedEndDate ?? dateToIso(row.workCloseActDate) ?? startDate;
  const numbers = [row.contractNumber, row.installationContractNumber, row.appliancesContractNumber]
    .map((v) => v?.trim())
    .filter(Boolean);
  return {
    ...nodeKeys({
      customerName: row.customerName,
      customerAddress: row.customerAddress,
      documentObjectId: row.package?.documentObjectId ?? null,
      packageId: row.packageId,
      contractId: row.contractId,
    }),
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
  };
}

export function waybillToNode(row: {
  id: string;
  date: Date;
  timeFrom: string | null;
  timeTo: string | null;
  status: WaybillTaskStatus;
  taskText: string;
  customerName: string | null;
  customerAddress: string | null;
  contractId: string | null;
}): JointRawNode {
  const startDate = dateToIso(row.date);
  const time =
    row.timeFrom || row.timeTo ? [row.timeFrom, row.timeTo].filter(Boolean).join('–') : null;
  return {
    ...nodeKeys({
      customerName: row.customerName,
      customerAddress: row.customerAddress,
      packageId: null,
      contractId: row.contractId,
    }),
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
  };
}

export function clusterJointNodes(nodes: JointRawNode[]): JointObjectCluster[] {
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
      if (i.kind === 'repair' || i.kind === 'furniture') return i.status !== 'CLOSED';
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

    items.sort((a, b) => {
      const da = DIR_ORDER[a.direction] ?? 99;
      const db = DIR_ORDER[b.direction] ?? 99;
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

export function filterAndSortClusters(
  clusters: JointObjectCluster[],
  searchRaw?: string,
): JointObjectCluster[] {
  const multi = clusters.filter((c) => c.directions.length >= 2);
  const search = searchRaw?.trim().toLowerCase();
  const filtered = search
    ? multi.filter((c) => {
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
    : multi;

  filtered.sort((a, b) => {
    const ae = a.rangeEnd ?? '';
    const be = b.rangeEnd ?? '';
    if (ae !== be) return ae < be ? -1 : 1;
    return a.label.localeCompare(b.label, 'ru');
  });
  return filtered;
}
