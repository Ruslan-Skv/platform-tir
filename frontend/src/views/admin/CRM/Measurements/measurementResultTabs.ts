import type { CrmDirection } from '@/shared/api/admin-crm';

export const MEASUREMENT_RESULT_TABS = [
  { id: 'repair', label: 'Ремонт' },
  { id: 'doors', label: 'Двери' },
  { id: 'windows', label: 'Окна' },
  { id: 'ceilings', label: 'Потолки' },
  { id: 'blinds', label: 'Жалюзи' },
  { id: 'furniture', label: 'Мебель' },
] as const;

export type MeasurementResultTabId = (typeof MEASUREMENT_RESULT_TABS)[number]['id'];

const DIRECTION_SLUG_TO_RESULT_TAB: Record<string, MeasurementResultTabId> = {
  repair: 'repair',
  doors: 'doors',
  windows: 'windows',
  'stretch-ceilings': 'ceilings',
  ceilings: 'ceilings',
  blinds: 'blinds',
  furniture: 'furniture',
};

export interface MeasurementResultTabView {
  id: MeasurementResultTabId;
  label: string;
  directionId: string;
}

export function resolveResultTabFromDirection(
  direction: CrmDirection
): MeasurementResultTabView | null {
  const tabId = DIRECTION_SLUG_TO_RESULT_TAB[direction.slug];
  if (!tabId) return null;
  return { id: tabId, label: direction.name, directionId: direction.id };
}

export function buildVisibleResultTabs(
  directionRows: string[],
  directions: CrmDirection[]
): MeasurementResultTabView[] {
  const tabs: MeasurementResultTabView[] = [];
  for (const directionId of directionRows) {
    const trimmed = directionId.trim();
    if (!trimmed) continue;
    const direction = directions.find((item) => item.id === trimmed);
    if (!direction) continue;
    const tab = resolveResultTabFromDirection(direction);
    if (tab) tabs.push(tab);
  }
  return tabs;
}

export function getResultTabLabel(
  tabId: MeasurementResultTabId,
  visibleTabs: MeasurementResultTabView[]
): string {
  return (
    visibleTabs.find((tab) => tab.id === tabId)?.label ??
    MEASUREMENT_RESULT_TABS.find((tab) => tab.id === tabId)?.label ??
    tabId
  );
}

export function areAllVisibleResultTabsSaved(
  visibleTabIds: MeasurementResultTabId[],
  savedTabs: Set<MeasurementResultTabId>
): boolean {
  return visibleTabIds.length > 0 && visibleTabIds.every((id) => savedTabs.has(id));
}

export function pruneSavedTabsToVisible(
  savedTabs: Set<MeasurementResultTabId>,
  visibleTabIds: MeasurementResultTabId[]
): Set<MeasurementResultTabId> {
  const visible = new Set(visibleTabIds);
  return new Set([...savedTabs].filter((id) => visible.has(id)));
}

/** Статус после сохранения/отмены вкладок: авто «Выполнен» когда все направления сохранены. */
export function resolveStatusAfterTabSaves(
  currentStatus: string,
  visibleTabIds: MeasurementResultTabId[],
  savedTabs: Set<MeasurementResultTabId>
): string {
  if (currentStatus === 'CANCELLED' || currentStatus === 'CONVERTED') {
    return currentStatus;
  }
  if (areAllVisibleResultTabsSaved(visibleTabIds, savedTabs)) {
    return 'COMPLETED';
  }
  if (currentStatus === 'COMPLETED') {
    return 'NEW';
  }
  return currentStatus;
}
