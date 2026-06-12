'use client';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { EstimateWorkScopeSplitModalView } from './EstimateWorkScopeSplitModalView';
import { useEstimateWorkScopeSplitModal } from './useEstimateWorkScopeSplitModal';

export type EstimateWorkScopeSplitModalProps = {
  preset: ContractEstimatePreset;
  groups: ContractEstimateGroup[];
  allPresets: ContractEstimatePreset[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    splitBundleId: string;
    estimateWorkScopeKeys: string[];
  }) => void | Promise<void>;
};

export function EstimateWorkScopeSplitModal(props: EstimateWorkScopeSplitModalProps) {
  const model = useEstimateWorkScopeSplitModal(props);
  return <EstimateWorkScopeSplitModalView {...model} />;
}
