import type {
  RepairScheduleProject,
  RepairScheduleProjectStatus,
} from '@/shared/api/crm/admin-repair-schedules';

import { formatMoney } from './repair-schedules';

/** Максимальный разрыв между датами подписания договоров одного объекта, чтобы держать их одним блоком. */
export const REPAIR_OBJECT_BLOCK_MONTHS = 2;

export type RepairObjectGroup = {
  id: string;
  /** Заголовок объекта: адрес или заказчик. */
  label: string;
  customerNames: string[];
  addresses: string[];
  projects: RepairScheduleProject[];
  /** true, если в группе ≥2 договора (общая шапка). */
  isCluster: boolean;
};

export function normalizeRepairGroupKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Дата подписания договора проекта; без пакета — дата создания как приближение. */
export function repairProjectSignDateIso(project: RepairScheduleProject): string {
  return project.contractDate || project.createdAt;
}

function parseDayUtc(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}

/** Помещается ли дата b в пределы N календарных месяцев от даты a. */
function withinMonths(aIso: string, bIso: string, months: number): boolean {
  const a = parseDayUtc(aIso);
  const b = parseDayUtc(bIso);
  if (!a || !b) return true;
  const limit = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + months, a.getUTCDate()));
  return b.getTime() <= limit.getTime();
}

/**
 * Разбивает договоры объекта на блоки по датам подписания: договоры, подписанные
 * в пределах REPAIR_OBJECT_BLOCK_MONTHS месяцев друг от друга, держим вместе
 * (одновременный ремонт); поэтапные ремонты с бОльшим разрывом идут отдельными блоками.
 */
function splitBySignDate(members: RepairScheduleProject[]): RepairScheduleProject[][] {
  const sorted = [...members].sort(
    (a, b) => Date.parse(repairProjectSignDateIso(a)) - Date.parse(repairProjectSignDateIso(b))
  );
  const blocks: RepairScheduleProject[][] = [];
  let current: RepairScheduleProject[] = [];
  for (const member of sorted) {
    const prev = current[current.length - 1];
    if (
      !prev ||
      withinMonths(
        repairProjectSignDateIso(prev),
        repairProjectSignDateIso(member),
        REPAIR_OBJECT_BLOCK_MONTHS
      )
    ) {
      current.push(member);
    } else {
      blocks.push(current);
      current = [member];
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

/**
 * Статус блока объекта: любой договор «в работе» → весь блок «в работе»
 * (закрытие — по последнему: блок закрыт, когда закрыты все его договоры).
 */
export function repairObjectGroupStatus(
  projects: RepairScheduleProject[]
): RepairScheduleProjectStatus {
  if (projects.some((p) => p.status === 'IN_PROGRESS')) return 'IN_PROGRESS';
  if (projects.some((p) => p.status === 'NEW')) return 'NEW';
  return 'CLOSED';
}

function uniqueDisplay(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const display = (raw ?? '').trim();
    if (!display) continue;
    const key = normalizeRepairGroupKey(display);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(display);
  }
  return out;
}

/**
 * Группирует проекты в «объекты»: договоры с общим адресом и/или общим заказчиком
 * объединяются (в т.ч. транзитивно).
 */
export function buildRepairObjectGroups(projects: RepairScheduleProject[]): RepairObjectGroup[] {
  const n = projects.length;
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

  for (let i = 0; i < n; i++) {
    const addr = normalizeRepairGroupKey(projects[i].customerAddress);
    const cust = normalizeRepairGroupKey(projects[i].customerName);
    if (addr) {
      const prev = byAddress.get(addr);
      if (prev !== undefined) union(i, prev);
      else byAddress.set(addr, i);
    }
    if (cust) {
      const prev = byCustomer.get(cust);
      if (prev !== undefined) union(i, prev);
      else byCustomer.set(cust, i);
    }
  }

  const buckets = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = buckets.get(root);
    if (list) list.push(i);
    else buckets.set(root, [i]);
  }

  const groups: RepairObjectGroup[] = [];
  for (const indices of buckets.values()) {
    const members = indices.map((i) => projects[i]);
    for (const blockMembers of splitBySignDate(members)) {
      const addresses = uniqueDisplay(blockMembers.map((m) => m.customerAddress));
      const customerNames = uniqueDisplay(blockMembers.map((m) => m.customerName));
      const label =
        addresses[0] ||
        customerNames[0] ||
        blockMembers[0]?.contractNumber ||
        blockMembers[0]?.id ||
        'Объект';
      const idSeed = [
        ...addresses.map((a) => `a:${normalizeRepairGroupKey(a)}`),
        ...customerNames.map((c) => `c:${normalizeRepairGroupKey(c)}`),
        ...blockMembers.map((m) => m.id),
      ].join('|');

      groups.push({
        id: idSeed,
        label,
        customerNames,
        addresses,
        projects: blockMembers,
        isCluster: blockMembers.length > 1,
      });
    }
  }

  // Стабильный порядок групп: по первому появлению проекта в исходном списке
  // (список уже отсортирован хронологически → объекты идут целиком).
  const order = new Map(projects.map((p, i) => [p.id, i]));
  groups.sort((a, b) => {
    const ai = Math.min(...a.projects.map((p) => order.get(p.id) ?? 0));
    const bi = Math.min(...b.projects.map((p) => order.get(p.id) ?? 0));
    return ai - bi;
  });

  // Внутри объекта сохраняем порядок исходного списка (хронология / срок).
  for (const group of groups) {
    group.projects.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  return groups;
}

/** Сравнение по дате создания проекта (прокси даты заключения / заведения). */
export function compareRepairProjectsByAge(
  a: RepairScheduleProject,
  b: RepairScheduleProject,
  newestFirst: boolean
): number {
  const ta = projectTimeMs(a.createdAt);
  const tb = projectTimeMs(b.createdAt);
  if (ta !== tb) return newestFirst ? tb - ta : ta - tb;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

function projectTimeMs(value: string | null | undefined): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

/** Сравнение по дате закрытия (позднее закрытые — выше при newestFirst). */
export function compareRepairProjectsByClosedAt(
  a: RepairScheduleProject,
  b: RepairScheduleProject,
  newestFirst: boolean
): number {
  const ta = projectTimeMs(a.closedAt) || projectTimeMs(a.updatedAt) || projectTimeMs(a.createdAt);
  const tb = projectTimeMs(b.closedAt) || projectTimeMs(b.updatedAt) || projectTimeMs(b.createdAt);
  if (ta !== tb) return newestFirst ? tb - ta : ta - tb;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export function repairObjectGroupSumLabel(projects: RepairScheduleProject[]): string {
  let sum = 0;
  let has = false;
  for (const p of projects) {
    const n =
      typeof p.contractSum === 'number'
        ? p.contractSum
        : Number(String(p.contractSum ?? '').replace(/\s/g, ''));
    if (Number.isFinite(n)) {
      sum += n;
      has = true;
    }
  }
  return has ? formatMoney(sum) : '—';
}
