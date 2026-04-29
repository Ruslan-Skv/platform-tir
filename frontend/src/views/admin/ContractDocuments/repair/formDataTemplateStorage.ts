import type { RepairDocumentTabId } from './repairDocumentTabs';
import type { RepairPackageFormData } from './repairPackageForm';
import { mergeRepairPackageFormData } from './repairPackageForm';

/** Вкладки с HTML-шаблоном (можно переопределить текст, в т.ч. загрузкой из Excel). */
export type RepairDocumentTemplateTabId = Exclude<RepairDocumentTabId, 'data'>;

const TEMPLATE_TAB_IDS: RepairDocumentTemplateTabId[] = [
  'contract',
  'actStart',
  'actAcceptance',
  'cashOrder',
  'questionnaire1',
  'questionnaire2',
  'addendum',
  'workOrder',
  'workOrderAddendum',
  'productionLog',
];

function isTemplateTabId(id: string): id is RepairDocumentTemplateTabId {
  return (TEMPLATE_TAB_IDS as string[]).includes(id);
}

export function parseTemplateOverrides(
  raw: unknown
): Partial<Record<RepairDocumentTemplateTabId, string>> {
  if (!raw || typeof raw !== 'object') return {};
  const root = raw as Record<string, unknown>;
  const o = root._templateOverrides;
  if (!o || typeof o !== 'object') return {};
  const out: Partial<Record<RepairDocumentTemplateTabId, string>> = {};
  for (const [k, v] of Object.entries(o)) {
    if (isTemplateTabId(k) && typeof v === 'string' && v.trim()) {
      out[k] = v;
    }
  }
  return out;
}

/** Убирает служебные ключи перед merge полей «Данные». */
export function stripInternalFormDataKeys(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const {
    _templateOverrides: _t,
    _contractTemplateId: _ct,
    _templatePresetIds: _tp,
    ...rest
  } = raw as Record<string, unknown>;
  return rest;
}

export function mergeFormDataFromStorage(raw: unknown): {
  form: RepairPackageFormData;
  templateOverrides: Partial<Record<RepairDocumentTemplateTabId, string>>;
  contractTemplateId: string | null;
  templatePresetIds: Partial<Record<RepairDocumentTemplateTabId, string>>;
} {
  const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  const contractTemplateId =
    root && typeof root._contractTemplateId === 'string' && root._contractTemplateId.trim()
      ? root._contractTemplateId.trim()
      : null;
  const templatePresetIds: Partial<Record<RepairDocumentTemplateTabId, string>> = {};
  const idsRaw = root?._templatePresetIds;
  if (idsRaw && typeof idsRaw === 'object') {
    for (const [k, v] of Object.entries(idsRaw as Record<string, unknown>)) {
      if (isTemplateTabId(k) && typeof v === 'string' && v.trim()) {
        templatePresetIds[k] = v.trim();
      }
    }
  }
  if (contractTemplateId && !templatePresetIds.contract) {
    templatePresetIds.contract = contractTemplateId;
  }
  return {
    form: mergeRepairPackageFormData(stripInternalFormDataKeys(raw)),
    templateOverrides: parseTemplateOverrides(raw),
    contractTemplateId,
    templatePresetIds,
  };
}

export function buildPersistedFormData(
  form: RepairPackageFormData,
  templateOverrides: Partial<Record<RepairDocumentTemplateTabId, string>>,
  templatePresetIds?: Partial<Record<RepairDocumentTemplateTabId, string>>
): Record<string, unknown> {
  const base = { ...(form as unknown as Record<string, unknown>) };
  const cleaned = Object.fromEntries(
    Object.entries(templateOverrides).filter(
      ([k, v]) => isTemplateTabId(k) && typeof v === 'string' && v.trim().length > 0
    )
  ) as Record<string, string>;
  if (Object.keys(cleaned).length > 0) {
    base._templateOverrides = cleaned;
  }
  const cleanedTemplateIds = Object.fromEntries(
    Object.entries(templatePresetIds ?? {}).filter(
      ([k, v]) => isTemplateTabId(k) && typeof v === 'string' && v.trim().length > 0
    )
  ) as Record<string, string>;
  if (Object.keys(cleanedTemplateIds).length > 0) {
    base._templatePresetIds = cleanedTemplateIds;
    if (cleanedTemplateIds.contract) {
      // Backward compatibility for already stored packages.
      base._contractTemplateId = cleanedTemplateIds.contract;
    }
  }
  return base;
}
