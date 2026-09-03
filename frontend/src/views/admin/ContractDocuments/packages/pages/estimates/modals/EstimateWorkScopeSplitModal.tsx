'use client';

import { useRef } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { EstimateWorkScopeSplitModalView } from './EstimateWorkScopeSplitModalView';
import { useEstimateWorkScopeSplitModal } from './useEstimateWorkScopeSplitModal';

export type EstimateWorkScopeSplitModalProps = {
  isOpen: boolean;
  preset: ContractEstimatePreset | null;
  groups: ContractEstimateGroup[];
  allPresets: ContractEstimatePreset[];
  saving: boolean;
  onClose: () => void;
  onSave: (
    presetId: string,
    payload: {
      splitBundleId: string;
      estimateWorkScopeKeys: string[];
    }
  ) => void | Promise<void>;
};

/**
 * Одна модалка на весь жизненный цикл (как «Настройки обучающей платформы»):
 * без remount при открытии/закрытии — плавное появление/исчезновение.
 */
export function EstimateWorkScopeSplitModal({
  isOpen,
  preset,
  groups,
  allPresets,
  saving,
  onClose,
  onSave,
}: EstimateWorkScopeSplitModalProps) {
  const cachedPresetRef = useRef<ContractEstimatePreset | null>(null);
  if (preset) cachedPresetRef.current = preset;
  const cachedPreset = cachedPresetRef.current;

  if (!cachedPreset) return null;

  return (
    <EstimateWorkScopeSplitModalOpened
      isOpen={isOpen}
      preset={cachedPreset}
      groups={groups}
      allPresets={allPresets}
      saving={saving}
      onClose={onClose}
      onSave={(payload) => onSave(cachedPreset.id, payload)}
    />
  );
}

function EstimateWorkScopeSplitModalOpened({
  isOpen,
  preset,
  groups,
  allPresets,
  saving,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  preset: ContractEstimatePreset;
  groups: ContractEstimateGroup[];
  allPresets: ContractEstimatePreset[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    splitBundleId: string;
    estimateWorkScopeKeys: string[];
  }) => void | Promise<void>;
}) {
  const model = useEstimateWorkScopeSplitModal({
    preset,
    groups,
    allPresets,
    saving,
    onClose,
    onSave,
  });
  return <EstimateWorkScopeSplitModalView {...model} isOpen={isOpen} />;
}
