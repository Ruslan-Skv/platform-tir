import type { FurnitureScheduleProject } from '@/shared/api/crm/admin-furniture-schedules';

import { formatMoney } from './furniture-schedules';

export type RepairObjectGroup = {
  id: string;
  /** Заголовок объекта: адрес или заказчик. */
  label: string;
  customerNames: string[];
  addresses: string[];
  projects: FurnitureScheduleProject[];
  /** true, если в группе ≥2 договора (общая шапка). */
  isCluster: boolean;
};

export function normalizeRepairGroupKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
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
export function buildRepairObjectGroups(projects: FurnitureScheduleProject[]): RepairObjectGroup[] {
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
    const addresses = uniqueDisplay(members.map((m) => m.customerAddress));
    const customerNames = uniqueDisplay(members.map((m) => m.customerName));
    const label =
      addresses[0] || customerNames[0] || members[0]?.contractNumber || members[0]?.id || 'Объект';
    const idSeed = [
      ...addresses.map((a) => `a:${normalizeRepairGroupKey(a)}`),
      ...customerNames.map((c) => `c:${normalizeRepairGroupKey(c)}`),
      ...members.map((m) => m.id),
    ].join('|');

    groups.push({
      id: idSeed,
      label,
      customerNames,
      addresses,
      projects: members,
      isCluster: members.length > 1,
    });
  }

  // Стабильный порядок: по первому появлению проекта в исходном списке
  const order = new Map(projects.map((p, i) => [p.id, i]));
  groups.sort((a, b) => {
    const ai = Math.min(...a.projects.map((p) => order.get(p.id) ?? 0));
    const bi = Math.min(...b.projects.map((p) => order.get(p.id) ?? 0));
    return ai - bi;
  });

  return groups;
}

export function furnitureObjectGroupSumLabel(projects: FurnitureScheduleProject[]): string {
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
