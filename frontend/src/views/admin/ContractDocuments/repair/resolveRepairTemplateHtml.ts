import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';

import type { RepairDocumentTemplateTabId } from './formDataTemplateStorage';
import { REPAIR_DOCUMENT_TEMPLATES } from './templates';

function normalizeTemplateTabId(tabId: string): RepairDocumentTemplateTabId {
  if (tabId === 'addendum') return 'addendum1';
  if (tabId === 'workOrderAddendum') return 'workOrderAddendum1';
  return tabId as RepairDocumentTemplateTabId;
}

export function resolveRepairTemplateHtml(
  tab: RepairDocumentTemplateTabId,
  presets: ContractTemplatePreset[],
  selectedTemplateIds: Partial<Record<RepairDocumentTemplateTabId, string>>,
  templateOverrides: Partial<Record<RepairDocumentTemplateTabId, string>>
): string {
  const override = templateOverrides[tab]?.trim();
  if (override) return override;

  const list = presets
    .filter((item) => {
      const rawTabId = item.tabId?.trim();
      if (!rawTabId || item.archived) return false;
      return normalizeTemplateTabId(rawTabId) === tab;
    })
    .map((item) => ({ ...item, tabId: normalizeTemplateTabId(item.tabId!.trim()) }));

  const selectedId = selectedTemplateIds[tab] ?? '';
  const selected = list.find((it) => it.id === selectedId);
  if (selected?.html?.trim()) return selected.html;

  const fallback = list.find((it) => it.isDefault) ?? list[0];
  if (fallback?.html?.trim()) return fallback.html;

  return REPAIR_DOCUMENT_TEMPLATES[tab];
}
