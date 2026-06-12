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
  contractAndEstimateLocked: boolean;
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
  estimatePresets: ContractEstimatePreset[];
  estimateUsageById: Map<string, EstimateUsageEntry[]>;
  draggingEstimatePresetId: string | null;
  setDraggingEstimatePresetId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedEstimateSections: EstimateEmbedSection[];
  contractDiscountPercentParsed: number;
  estimatePrintSheetRef: RefObject<HTMLElement | null>;
  onEstimateObjectChange: (groupKey: string) => void;
  onAttachPreset: (presetId: string) => void;
  onMovePreset: (sourceId: string, targetId: string) => void;
  onRemovePreset: (presetId: string) => void;
};

export function PackageEstimateTab(props: PackageEstimateTabProps) {
  return <PackageEstimateTabView {...props} />;
}
