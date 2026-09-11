import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

/** Ключ сравнения адресов объекта (пакет ↔ группа/расчёт). */
export function normalizeAddressMatchKey(address: string): string {
  return address.trim().toLowerCase();
}

/**
 * Ключ «Объект» для прикрепления сметы/счёт-заказа по адресу из вкладки «Данные».
 * Сравнивает адрес пакета с `objectAddress` расчёта и с заголовком группы.
 */
export function findAttachGroupKeyForPackageObjectAddress(params: {
  packageObjectAddress: string;
  attachablePresets: Array<{ groupId?: string | null; objectAddress?: string | null }>;
  groups: Array<{ id: string; title: string }>;
}): string {
  const addrKey = normalizeAddressMatchKey(params.packageObjectAddress);
  if (!addrKey) return '';

  const byPresetAddress = params.attachablePresets.find(
    (p) => normalizeAddressMatchKey(p.objectAddress ?? '') === addrKey
  );
  if (byPresetAddress) {
    const gid = byPresetAddress.groupId?.trim();
    if (!gid) return '__ungrouped__';
    if (params.groups.some((g) => g.id === gid)) return gid;
  }

  const groupIdsWithAttachable = new Set(
    params.attachablePresets.map((p) => p.groupId).filter((id): id is string => Boolean(id?.trim()))
  );
  const byGroupTitle = params.groups.find(
    (g) => groupIdsWithAttachable.has(g.id) && normalizeAddressMatchKey(g.title) === addrKey
  );
  return byGroupTitle?.id ?? '';
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
 * Группа объекта — заголовок-адрес (так объект показан в списке расчётов и в каталоге
 * прикрепления). Расчёт без группы привязывается к группе своего адреса (или создаётся
 * новая), а при смене адреса — переезжает из старой группы в группу нового адреса.
 * Без адреса группа не назначается.
 */
export function ensureEstimateObjectGroups(
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[]
): EnsureEstimateObjectGroupsResult {
  const nextGroups = [...groups];
  const addressToGroupId = new Map<string, string>();

  for (const g of nextGroups) {
    const key = normalizeAddressMatchKey(g.title);
    if (key && !addressToGroupId.has(key)) addressToGroupId.set(key, g.id);
  }

  let changed = false;
  const now = new Date().toISOString();

  const nextItems = items.map((it) => {
    const addr = (it.objectAddress ?? '').trim();
    if (!addr) return it;

    const matchKey = normalizeAddressMatchKey(addr);
    const currentGroupId = it.groupId?.trim();
    const currentGroup = currentGroupId
      ? nextGroups.find((g) => g.id === currentGroupId)
      : undefined;

    if (currentGroup && normalizeAddressMatchKey(currentGroup.title) === matchKey) {
      addressToGroupId.set(matchKey, currentGroup.id);
      return it;
    }

    let groupId = addressToGroupId.get(matchKey);
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
