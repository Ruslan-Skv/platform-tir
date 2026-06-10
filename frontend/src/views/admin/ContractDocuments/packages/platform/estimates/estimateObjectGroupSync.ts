import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

function normalizeAddressMatchKey(address: string): string {
  return address.trim().toLowerCase();
}

function newGroupId(): string {
  return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export type EnsureEstimateObjectGroupsResult = {
  items: ContractEstimatePreset[];
  groups: ContractEstimateGroup[];
  changed: boolean;
};

/**
 * Расчёты с адресом объекта, но без `groupId`, привязываются к группе с тем же `title` (адрес)
 * или создаётся новая группа. Без адреса группа не назначается.
 */
export function ensureEstimateObjectGroups(
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[]
): EnsureEstimateObjectGroupsResult {
  const nextGroups = [...groups];
  const addressToGroupId = new Map<string, string>();

  for (const g of nextGroups) {
    const key = normalizeAddressMatchKey(g.title);
    if (key) addressToGroupId.set(key, g.id);
  }

  for (const it of items) {
    const addr = (it.objectAddress ?? '').trim();
    if (!addr || !it.groupId) continue;
    const key = normalizeAddressMatchKey(addr);
    if (!addressToGroupId.has(key)) {
      addressToGroupId.set(key, it.groupId);
    }
  }

  let changed = false;
  const now = new Date().toISOString();

  const nextItems = items.map((it) => {
    const addr = (it.objectAddress ?? '').trim();
    if (!addr) return it;

    const matchKey = normalizeAddressMatchKey(addr);
    let groupId = it.groupId?.trim();
    if (groupId && nextGroups.some((g) => g.id === groupId)) {
      addressToGroupId.set(matchKey, groupId);
      return it;
    }

    groupId = addressToGroupId.get(matchKey);
    if (!groupId) {
      const peer = items.find(
        (p) =>
          p.id !== it.id &&
          normalizeAddressMatchKey(p.objectAddress ?? '') === matchKey &&
          p.groupId?.trim()
      );
      groupId = peer?.groupId?.trim();
    }
    if (!groupId) {
      groupId = newGroupId();
      nextGroups.push({ id: groupId, title: addr, updatedAt: now });
      addressToGroupId.set(matchKey, groupId);
      changed = true;
    }

    if (it.groupId !== groupId) {
      changed = true;
      return { ...it, groupId };
    }
    return it;
  });

  return { items: nextItems, groups: nextGroups, changed };
}
