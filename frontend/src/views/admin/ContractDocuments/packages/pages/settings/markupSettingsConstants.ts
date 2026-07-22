import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import {
  getContractDocumentWorkOrderMarkupSettings,
  putContractDocumentWorkOrderMarkupSettings,
} from '@/shared/api/admin-contract-document-packages';

import { DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT } from '../../families/product-like/print/productWorkOrder';

export type MarkupSettingsKind = Extract<
  ContractDocumentPackageKind,
  'WINDOWS' | 'DOORS' | 'BLINDS' | 'CEILINGS'
>;

export const MARKUP_SETTINGS_KINDS: MarkupSettingsKind[] = [
  'WINDOWS',
  'DOORS',
  'BLINDS',
  'CEILINGS',
];

type MarkupKindConfigEntry = {
  title: string;
  inputId: string;
  fallbackPercent: number;
  load: () => Promise<{ windowsWorkOrderMarkupPercent: number; updatedAt: string | null }>;
  save: (body: {
    windowsWorkOrderMarkupPercent: number;
  }) => Promise<{ windowsWorkOrderMarkupPercent: number; updatedAt: string | null }>;
  saveOk: (percent: number) => string;
};

function kindConfig(kind: MarkupSettingsKind, title: string): MarkupKindConfigEntry {
  return {
    title,
    inputId: `package_${kind.toLowerCase()}_work_order_markup`,
    fallbackPercent: DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
    load: () => getContractDocumentWorkOrderMarkupSettings(kind),
    save: (body) =>
      putContractDocumentWorkOrderMarkupSettings({
        kind,
        windowsWorkOrderMarkupPercent: body.windowsWorkOrderMarkupPercent,
      }),
    saveOk: (percent) => `Наценка для «${title}» сохранена (${percent} %).`,
  };
}

export const MARKUP_KIND_CONFIG: Record<MarkupSettingsKind, MarkupKindConfigEntry> = {
  WINDOWS: kindConfig('WINDOWS', 'Окна'),
  DOORS: kindConfig('DOORS', 'Двери'),
  BLINDS: kindConfig('BLINDS', 'Жалюзи'),
  CEILINGS: kindConfig('CEILINGS', 'Натяжные потолки'),
};
