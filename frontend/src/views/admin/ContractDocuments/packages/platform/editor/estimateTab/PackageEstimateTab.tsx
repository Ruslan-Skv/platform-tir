'use client';

import type { RefObject } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { EstimateEmbedSection } from '../../estimates/packageEstimateDocPrintEmbedHtml';
import type { PackageFormData } from '../../form/packageForm';
import { PackageEstimateTabView } from './PackageEstimateTabView';

export type EstimateUsageEntry = { contractNumber: string; contractDate: string };

export type PackageEstimateTabProps = {
  form: PackageFormData;
  signedDocsLocked: boolean;
  isProductDirectionPackage: boolean;
  linkedCrmCustomerId: string | null;
  estimateAppendixContractRef: { num: string; date: string };
  contractEstimateObjectKey: string;
  estimateAttachGroupKey: string;
  setEstimateAttachGroupKey: React.Dispatch<React.SetStateAction<string>>;
  estimatePresetToAttach: string;
  setEstimatePresetToAttach: React.Dispatch<React.SetStateAction<string>>;
  attachEstimatePickMeta: {
    hasUngrouped: boolean;
    groupsOrdered: ContractEstimateGroup[];
  };
  attachableForSelectedGroup: ContractEstimatePreset[];
  attachableEstimatePresets: ContractEstimatePreset[];
  attachBlockedByCrmMismatch: boolean;
  attachBlockedByDirectionMismatch: boolean;
  estimatePresets: ContractEstimatePreset[];
  /** Объекты расчётов — для показа наценки, наследуемой от объекта. */
  estimateGroups: ContractEstimateGroup[];
  estimateUsageById: Map<string, EstimateUsageEntry[]>;
  /** Расчёты, прикреплённые к подписанным договорам/Д/с: наценка только для просмотра. */
  lockedEstimatePresetIds: Set<string>;
  draggingEstimatePresetId: string | null;
  setDraggingEstimatePresetId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedEstimateSections: EstimateEmbedSection[];
  contractDiscountPercentParsed: number;
  estimatePrintSheetRef: RefObject<HTMLElement | null>;
  onEstimateObjectChange: (groupKey: string) => void;
  onAttachPreset: (presetId: string) => void;
  onMovePreset: (sourceId: string, targetId: string) => void;
  onRemovePreset: (presetId: string) => void;
  /**
   * Смена наценки расчёта (то же поле, что в разделе «Расчёты»): сохраняет пресет
   * и пересчитывает смету/суммы этого пакета.
   */
  estimateMarkupSaving: boolean;
  onEstimatePresetMarkupChange: (presetId: string, raw: string) => void;
  /** Скидка на работы (то же поле, что на вкладке «Данные»): тип и значения. */
  onContractDiscountTypeChange: (value: 'PERCENT' | 'AMOUNT') => void;
  onContractDiscountPercentChange: (value: string) => void;
  onContractDiscountAmountChange: (value: string) => void;
};

export function PackageEstimateTab(props: PackageEstimateTabProps) {
  return <PackageEstimateTabView {...props} />;
}
