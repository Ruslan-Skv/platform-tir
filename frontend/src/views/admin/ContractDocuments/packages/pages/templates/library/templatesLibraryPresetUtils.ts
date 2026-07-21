import {
  type ContractDocumentPackageKind,
  type ContractTemplatePreset,
  sanitizeContractTemplatePresetForApi,
} from '@/shared/api/admin-contract-document-packages';
import {
  type PackageLibraryTemplateTabId,
  normalizeLibraryTemplateTabForPackageKind,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';
import { packageLibraryTemplateTabIdFromPreset } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';

import {
  TEMPLATES_ACTIVE_KIND_KEY,
  TEMPLATES_ACTIVE_TAB_KEY,
  TEMPLATES_UI_PREFS_KEY,
  type TemplatesUiPrefs,
} from './templatesLibraryStorage';

export function normalizeContractTemplatePreset(
  it: ContractTemplatePreset
): ContractTemplatePreset {
  const tabId = packageLibraryTemplateTabIdFromPreset(it.tabId);
  return sanitizeContractTemplatePresetForApi({
    ...it,
    tabId: tabId ?? it.tabId,
    archived: Boolean(it.archived),
  });
}

export function filterTemplatesByActiveKind(
  items: ContractTemplatePreset[],
  activeKind: ContractDocumentPackageKind
): ContractTemplatePreset[] {
  return items.filter((it) => {
    const kind = (it as ContractTemplatePreset & { kind?: unknown }).kind;
    if (typeof kind !== 'string' || !kind.trim()) return true;
    return kind === activeKind;
  });
}

export const TEMPLATE_LIBRARY_KIND_OPTIONS = [
  { value: 'REPAIR' as const, label: 'Ремонт' },
  { value: 'WINDOWS' as const, label: 'Окна' },
  { value: 'DOORS' as const, label: 'Двери' },
  { value: 'BLINDS' as const, label: 'Жалюзи' },
  { value: 'CEILINGS' as const, label: 'Натяжные потолки' },
];

export function templateLibraryKindLabel(kind: ContractDocumentPackageKind): string {
  const found = TEMPLATE_LIBRARY_KIND_OPTIONS.find((it) => it.value === kind);
  return found?.label ?? kind;
}

function isTemplateLibraryKind(
  value: string | null | undefined
): value is ContractDocumentPackageKind {
  return Boolean(value && TEMPLATE_LIBRARY_KIND_OPTIONS.some((o) => o.value === value));
}

/** Синхронное чтение направления — чтобы первый рендер совпал с localStorage (без гонки с useEffect). */
export function readStoredTemplatesLibraryKind(): ContractDocumentPackageKind {
  if (typeof window === 'undefined') return 'REPAIR';
  try {
    const activeKindRaw = window.localStorage.getItem(TEMPLATES_ACTIVE_KIND_KEY);
    if (isTemplateLibraryKind(activeKindRaw)) return activeKindRaw;
    const raw = window.localStorage.getItem(TEMPLATES_UI_PREFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as TemplatesUiPrefs) : null;
    if (parsed && isTemplateLibraryKind(parsed.activeLibraryKind)) {
      return parsed.activeLibraryKind;
    }
  } catch {
    // ignore broken localStorage payload
  }
  return 'REPAIR';
}

export function readStoredTemplatesLibraryTab(
  kind: ContractDocumentPackageKind
): PackageLibraryTemplateTabId {
  if (typeof window === 'undefined') return 'contract';
  try {
    const activeTabRaw = window.localStorage.getItem(TEMPLATES_ACTIVE_TAB_KEY);
    if (typeof activeTabRaw === 'string' && activeTabRaw.trim()) {
      return normalizeLibraryTemplateTabForPackageKind(activeTabRaw, kind);
    }
    const raw = window.localStorage.getItem(TEMPLATES_UI_PREFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as TemplatesUiPrefs) : null;
    if (parsed && typeof parsed.activeTemplateTab === 'string') {
      return normalizeLibraryTemplateTabForPackageKind(parsed.activeTemplateTab, kind);
    }
  } catch {
    // ignore broken localStorage payload
  }
  return 'contract';
}
