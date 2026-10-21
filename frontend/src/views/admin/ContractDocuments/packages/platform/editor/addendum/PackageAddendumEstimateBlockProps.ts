import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import type {
  PackageAddendumSlotDiscountType,
  PackageAddendumSlotEstimateBlock,
} from '../../form/types';

export type EstimateUsageRow = {
  packageId: string;
  packageTitle: string;
  contractNumber: string;
  contractDate: string;
};

export type PackageAddendumEstimateBlockProps = {
  slotOrdinal: number;
  slot: PackageAddendumSlotEstimateBlock;
  isWindowsPackage?: boolean;
  /** Внутри вкладки Д/с по «Окна» — только блок счёт-заказа (без шапки и даты). */
  layout?: 'full' | 'accountOrderOnly';
  documentDate: string;
  onDocumentDateChange: (value: string) => void;
  workPeriodIncreaseDays: string;
  onWorkPeriodIncreaseDaysChange: (value: string) => void;
  /** Скидка Д/с: подпись наследуемой договоровой (напр. «5%» или «нет»). */
  contractDiscountLabel: string;
  /** Изменение скидки Д/с (тип / % / рубли); блокируется при подписании Д/с. */
  onSlotDiscountChange: (patch: {
    discountType?: PackageAddendumSlotDiscountType;
    discountPercent?: string;
    discountAmount?: string;
  }) => void;
  /** Подсказка по рублёвой скидке Д/с (пересчёт в % от итога работ Д/с). */
  slotDiscountHint: string | null;
  estimatePresets: ContractEstimatePreset[];
  /** Подпись объекта из вкладки «Смета» (пусто — объект ещё не задан). */
  contractEstimateObjectLabel: string;
  addendumAttachablePresets: ContractEstimatePreset[];
  addendumExcludedAttachablePresets: ContractEstimatePreset[];
  presetToAttach: string;
  setPresetToAttach: (v: string) => void;
  excludedPresetToAttach: string;
  setExcludedPresetToAttach: (v: string) => void;
  onAttachPreset: () => void;
  onAttachExcludedPreset: () => void;
  onRemovePreset: (presetId: string) => void;
  onRemoveExcludedPreset: (presetId: string) => void;
  onReorderPresets: (sourceId: string, targetId: string) => void;
  onReorderExcludedPresets: (sourceId: string, targetId: string) => void;
  estimateUsageById: Map<string, EstimateUsageRow[]>;
  draggingPresetId: string | null;
  setDraggingPresetId: (v: string | null) => void;
  draggingExcludedPresetId: string | null;
  setDraggingExcludedPresetId: (v: string | null) => void;
  canUnmarkSigned: boolean;
  onUnmarkSigned: () => void;
  canUnmarkPaid: boolean;
  onUnmarkPaid: () => void;
};
