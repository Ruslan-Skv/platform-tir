import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import {
  getContractDocumentRepairWorkOrderSettings,
  getContractDocumentWorkOrderMarkupSettings,
  putContractDocumentRepairWorkOrderSettings,
  putContractDocumentWorkOrderMarkupSettings,
} from '@/shared/api/admin-contract-document-packages';

import { DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT } from '../../families/product-like/print/productWorkOrder';

export type MarkupSettingsKind = Extract<
  ContractDocumentPackageKind,
  'REPAIR' | 'WINDOWS' | 'DOORS' | 'BLINDS' | 'CEILINGS'
>;

export const MARKUP_SETTINGS_KINDS: MarkupSettingsKind[] = [
  'REPAIR',
  'WINDOWS',
  'DOORS',
  'BLINDS',
  'CEILINGS',
];

/** Снимок глобальных настроек заказ-наряда направления (null — не задано). */
export type MarkupKindSettingsSnapshot = {
  markupPercent: number | null;
  taxPercent: number | null;
  updatedAt: string | null;
};

type MarkupKindConfigEntry = {
  title: string;
  inputId: string;
  /** Дополнительное поле «Налог, %» (только «Ремонт»). */
  taxInputId?: string;
  fallbackPercent: number;
  load: () => Promise<MarkupKindSettingsSnapshot>;
  save: (body: {
    markupPercent: number;
    taxPercent: number | null;
  }) => Promise<MarkupKindSettingsSnapshot>;
  saveOk: (res: MarkupKindSettingsSnapshot) => string;
};

function productKindConfig(
  kind: Exclude<MarkupSettingsKind, 'REPAIR'>,
  title: string
): MarkupKindConfigEntry {
  return {
    title,
    inputId: `package_${kind.toLowerCase()}_work_order_markup`,
    fallbackPercent: DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
    load: async () => {
      const res = await getContractDocumentWorkOrderMarkupSettings(kind);
      return {
        markupPercent: res.windowsWorkOrderMarkupPercent,
        taxPercent: null,
        updatedAt: res.updatedAt,
      };
    },
    save: async (body) => {
      const res = await putContractDocumentWorkOrderMarkupSettings({
        kind,
        windowsWorkOrderMarkupPercent: body.markupPercent,
      });
      return {
        markupPercent: res.windowsWorkOrderMarkupPercent,
        taxPercent: null,
        updatedAt: res.updatedAt,
      };
    },
    saveOk: (res) => `Наценка для «${title}» сохранена (${res.markupPercent} %).`,
  };
}

export const MARKUP_KIND_CONFIG: Record<MarkupSettingsKind, MarkupKindConfigEntry> = {
  REPAIR: {
    title: 'Ремонт',
    inputId: 'package_repair_work_order_markup',
    taxInputId: 'package_repair_work_order_tax',
    fallbackPercent: 0,
    load: async () => {
      const res = await getContractDocumentRepairWorkOrderSettings();
      return {
        markupPercent: res.markupPercent,
        taxPercent: res.taxPercent,
        updatedAt: res.updatedAt,
      };
    },
    save: async (body) => {
      const res = await putContractDocumentRepairWorkOrderSettings({
        markupPercent: body.markupPercent,
        taxPercent: body.taxPercent ?? 0,
      });
      return {
        markupPercent: res.markupPercent,
        taxPercent: res.taxPercent,
        updatedAt: res.updatedAt,
      };
    },
    saveOk: (res) =>
      `Наценка ${res.markupPercent} % и налог ${res.taxPercent ?? 0} % для «Ремонт» сохранены.`,
  },
  WINDOWS: productKindConfig('WINDOWS', 'Окна'),
  DOORS: productKindConfig('DOORS', 'Двери'),
  BLINDS: productKindConfig('BLINDS', 'Жалюзи'),
  CEILINGS: productKindConfig('CEILINGS', 'Натяжные потолки'),
};
