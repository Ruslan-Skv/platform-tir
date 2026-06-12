'use client';

import type { ComponentProps } from 'react';
import { useCallback, useMemo } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { ProductAddendumTab } from '../../../families/product-like/addendum/ProductAddendumTab';
import type { ProductAddendumSpecificationLine } from '../../../families/product-like/addendum/addendumSpecification';
import { PackageAddendumEstimateBlock } from '../../editor/addendum/PackageAddendumEstimateBlock';
import { applyEstimatePresetIdsToAddendumSlot } from '../../estimates/applyEstimatePresetIds';
import type { PackageFormData } from '../../form/packageForm';
import {
  CONTRACT_SIGNED_REVERT_WINDOW_MS,
  PACKAGE_HUB_MODAL_TITLE,
} from '../../hub/hubModal/packageHubConstants';

const STATUS_REVERT_WINDOW_MS = 24 * 60 * 60 * 1000;

function isWithinRevertWindow(iso: string | null | undefined): boolean {
  if (!iso?.trim()) return false;
  const ts = Date.parse(iso.trim());
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= STATUS_REVERT_WINDOW_MS;
}

function isWithinMsSinceIso(iso: string | null | undefined, windowMs: number): boolean {
  if (!iso?.trim()) return false;
  const ts = Date.parse(iso.trim());
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= windowMs;
}

type EstimateUsageRow = {
  packageId: string;
  packageTitle: string;
  contractNumber: string;
  contractDate: string;
};

export type UsePackageAddendumEditorOptions = {
  activeAddendumSlot: number | null;
  form: PackageFormData;
  formRef: React.MutableRefObject<PackageFormData>;
  contractAndEstimateLocked: boolean;
  isProductDirectionPackage: boolean;
  contractEstimateObjectKey: string;
  estimateGroups: ContractEstimateGroup[];
  estimatePresets: ContractEstimatePreset[];
  attachableAddendumEstimatePresets: ContractEstimatePreset[];
  attachableAddendumExcludedEstimatePresets: ContractEstimatePreset[];
  estimateUsageById: Map<string, EstimateUsageRow[]>;
  addendumPresetToAttach: string;
  setAddendumPresetToAttach: React.Dispatch<React.SetStateAction<string>>;
  addendumExcludedPresetToAttach: string;
  setAddendumExcludedPresetToAttach: React.Dispatch<React.SetStateAction<string>>;
  draggingAddendumEstimatePresetId: string | null;
  setDraggingAddendumEstimatePresetId: React.Dispatch<React.SetStateAction<string | null>>;
  draggingAddendumExcludedEstimatePresetId: string | null;
  setDraggingAddendumExcludedEstimatePresetId: React.Dispatch<React.SetStateAction<string | null>>;
  patchAddendumDocumentDate: (slotIndex0: number, value: string) => void;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  schedulePersistDebounced: () => void;
  touchPackageData: () => void;
};

export function usePackageAddendumEditor({
  activeAddendumSlot,
  form,
  formRef,
  contractAndEstimateLocked,
  isProductDirectionPackage,
  contractEstimateObjectKey,
  estimateGroups,
  estimatePresets,
  attachableAddendumEstimatePresets,
  attachableAddendumExcludedEstimatePresets,
  estimateUsageById,
  addendumPresetToAttach,
  setAddendumPresetToAttach,
  addendumExcludedPresetToAttach,
  setAddendumExcludedPresetToAttach,
  draggingAddendumEstimatePresetId,
  setDraggingAddendumEstimatePresetId,
  draggingAddendumExcludedEstimatePresetId,
  setDraggingAddendumExcludedEstimatePresetId,
  patchAddendumDocumentDate,
  setForm,
  setDirty,
  schedulePersistDebounced,
  touchPackageData,
}: UsePackageAddendumEditorOptions) {
  const contractEstimateObjectLabel = useMemo(
    () =>
      contractEstimateObjectKey
        ? contractEstimateObjectKey === '__ungrouped__'
          ? 'Вне объекта'
          : (estimateGroups.find((g) => g.id === contractEstimateObjectKey)?.title ??
            contractEstimateObjectKey)
        : '',
    [contractEstimateObjectKey, estimateGroups]
  );

  const patchAddendumSlotField = useCallback(
    (slotIndex0: number, patch: Partial<PackageFormData['addendumSlots'][number]>) => {
      setForm((p) => {
        const slots = [...p.addendumSlots] as PackageFormData['addendumSlots'];
        slots[slotIndex0] = { ...slots[slotIndex0], ...patch };
        const next = { ...p, addendumSlots: slots };
        formRef.current = next;
        schedulePersistDebounced();
        setDirty(true);
        return next;
      });
    },
    [formRef, schedulePersistDebounced, setDirty, setForm]
  );

  const applyAddendumPresetIds = useCallback(
    (slotIndex0: number, presetIds: string[], mode: 'additional' | 'excluded') => {
      setForm((p) => {
        const next = applyEstimatePresetIdsToAddendumSlot(
          p,
          slotIndex0,
          presetIds,
          estimatePresets,
          estimateGroups,
          mode
        );
        formRef.current = next;
        schedulePersistDebounced();
        setDirty(true);
        return next;
      });
    },
    [estimateGroups, estimatePresets, formRef, schedulePersistDebounced, setDirty, setForm]
  );

  const unmarkAddendumSlotSigned = useCallback(
    (slotIndex0: number) => {
      setForm((p) => {
        const slots = [...p.addendumSlots] as PackageFormData['addendumSlots'];
        const cur = slots[slotIndex0];
        if (!cur || cur.status !== 'SIGNED') return p;
        if (!isWithinMsSinceIso(cur.signedAt, CONTRACT_SIGNED_REVERT_WINDOW_MS)) return p;
        slots[slotIndex0] = { ...cur, status: 'OPEN', signedAt: '', paidAt: '' };
        const next = { ...p, addendumSlots: slots };
        formRef.current = next;
        return next;
      });
      touchPackageData();
    },
    [formRef, setForm, touchPackageData]
  );

  const unmarkAddendumSlotPaid = useCallback(
    (slotIndex0: number) => {
      setForm((p) => {
        const slots = [...p.addendumSlots] as PackageFormData['addendumSlots'];
        const cur = slots[slotIndex0];
        if (!cur || cur.status !== 'PAID') return p;
        if (!isWithinRevertWindow(cur.paidAt)) return p;
        slots[slotIndex0] = { ...cur, status: 'SIGNED', paidAt: '' };
        const next = { ...p, addendumSlots: slots };
        formRef.current = next;
        return next;
      });
      touchPackageData();
    },
    [formRef, setForm, touchPackageData]
  );

  const estimateBlockProps = useMemo((): ComponentProps<
    typeof PackageAddendumEstimateBlock
  > | null => {
    if (activeAddendumSlot === null) return null;
    const slotIndex0 = activeAddendumSlot - 1;
    const slot = form.addendumSlots[slotIndex0];
    if (!slot) return null;

    return {
      slotOrdinal: activeAddendumSlot,
      slot,
      isWindowsPackage: isProductDirectionPackage,
      documentDate: form.addendumDocumentDates[slotIndex0] ?? '',
      onDocumentDateChange: (v) => patchAddendumDocumentDate(slotIndex0, v),
      workPeriodIncreaseDays: slot.workPeriodIncreaseDays ?? '',
      onWorkPeriodIncreaseDaysChange: (v) =>
        patchAddendumSlotField(slotIndex0, { workPeriodIncreaseDays: v }),
      estimatePresets,
      contractEstimateObjectLabel,
      addendumAttachablePresets: attachableAddendumEstimatePresets,
      addendumExcludedAttachablePresets: attachableAddendumExcludedEstimatePresets,
      presetToAttach: addendumPresetToAttach,
      setPresetToAttach: setAddendumPresetToAttach,
      excludedPresetToAttach: addendumExcludedPresetToAttach,
      setExcludedPresetToAttach: setAddendumExcludedPresetToAttach,
      onAttachPreset: () => {
        if (!addendumPresetToAttach) return;
        const pid = addendumPresetToAttach;
        const current = formRef.current.addendumSlots[slotIndex0]?.selectedPresetIds ?? [];
        applyAddendumPresetIds(slotIndex0, [...current, pid], 'additional');
        setAddendumPresetToAttach('');
      },
      onAttachExcludedPreset: () => {
        if (!addendumExcludedPresetToAttach) return;
        const pid = addendumExcludedPresetToAttach;
        const current = formRef.current.addendumSlots[slotIndex0]?.excludedSelectedPresetIds ?? [];
        applyAddendumPresetIds(slotIndex0, [...current, pid], 'excluded');
        setAddendumExcludedPresetToAttach('');
      },
      onRemovePreset: (presetId) => {
        const current = formRef.current.addendumSlots[slotIndex0]?.selectedPresetIds ?? [];
        applyAddendumPresetIds(
          slotIndex0,
          current.filter((id) => id !== presetId),
          'additional'
        );
      },
      onRemoveExcludedPreset: (presetId) => {
        const current = formRef.current.addendumSlots[slotIndex0]?.excludedSelectedPresetIds ?? [];
        applyAddendumPresetIds(
          slotIndex0,
          current.filter((id) => id !== presetId),
          'excluded'
        );
      },
      onReorderPresets: (sourceId, targetId) => {
        const ids = [...(formRef.current.addendumSlots[slotIndex0]?.selectedPresetIds ?? [])];
        const from = ids.indexOf(sourceId);
        const to = ids.indexOf(targetId);
        if (from < 0 || to < 0) return;
        const [moved] = ids.splice(from, 1);
        ids.splice(to, 0, moved);
        applyAddendumPresetIds(slotIndex0, ids, 'additional');
      },
      onReorderExcludedPresets: (sourceId, targetId) => {
        const ids = [
          ...(formRef.current.addendumSlots[slotIndex0]?.excludedSelectedPresetIds ?? []),
        ];
        const from = ids.indexOf(sourceId);
        const to = ids.indexOf(targetId);
        if (from < 0 || to < 0) return;
        const [moved] = ids.splice(from, 1);
        ids.splice(to, 0, moved);
        applyAddendumPresetIds(slotIndex0, ids, 'excluded');
      },
      estimateUsageById,
      draggingPresetId: draggingAddendumEstimatePresetId,
      setDraggingPresetId: setDraggingAddendumEstimatePresetId,
      draggingExcludedPresetId: draggingAddendumExcludedEstimatePresetId,
      setDraggingExcludedPresetId: setDraggingAddendumExcludedEstimatePresetId,
      canUnmarkSigned: isWithinMsSinceIso(slot.signedAt, CONTRACT_SIGNED_REVERT_WINDOW_MS),
      onUnmarkSigned: () => unmarkAddendumSlotSigned(slotIndex0),
      canUnmarkPaid: isWithinRevertWindow(slot.paidAt),
      onUnmarkPaid: () => unmarkAddendumSlotPaid(slotIndex0),
    };
  }, [
    activeAddendumSlot,
    addendumExcludedPresetToAttach,
    addendumPresetToAttach,
    applyAddendumPresetIds,
    attachableAddendumEstimatePresets,
    attachableAddendumExcludedEstimatePresets,
    contractEstimateObjectLabel,
    draggingAddendumEstimatePresetId,
    draggingAddendumExcludedEstimatePresetId,
    estimatePresets,
    estimateUsageById,
    form.addendumDocumentDates,
    form.addendumSlots,
    isProductDirectionPackage,
    patchAddendumDocumentDate,
    patchAddendumSlotField,
    setAddendumExcludedPresetToAttach,
    setAddendumPresetToAttach,
    setDraggingAddendumEstimatePresetId,
    setDraggingAddendumExcludedEstimatePresetId,
    unmarkAddendumSlotPaid,
    unmarkAddendumSlotSigned,
    formRef,
  ]);

  const windowsAddendumTabProps = useMemo((): ComponentProps<typeof ProductAddendumTab> | null => {
    if (activeAddendumSlot === null || !estimateBlockProps) return null;
    const slotIndex0 = activeAddendumSlot - 1;
    const slot = form.addendumSlots[slotIndex0];
    if (!slot) return null;

    return {
      slotOrdinal: activeAddendumSlot,
      slot,
      contractDiscountPercent: form.contract.discountPercent,
      documentDate: form.addendumDocumentDates[slotIndex0] ?? '',
      onDocumentDateChange: (v) => patchAddendumDocumentDate(slotIndex0, v),
      workPeriodIncreaseDays: slot.workPeriodIncreaseDays ?? '',
      onWorkPeriodIncreaseDaysChange: (v) =>
        patchAddendumSlotField(slotIndex0, { workPeriodIncreaseDays: v }),
      onSpecificationAddedLinesChange: (lines: ProductAddendumSpecificationLine[]) =>
        patchAddendumSlotField(slotIndex0, { specificationAddedLines: lines }),
      onSpecificationExcludedLinesChange: (lines: ProductAddendumSpecificationLine[]) =>
        patchAddendumSlotField(slotIndex0, { specificationExcludedLines: lines }),
      estimateBlockProps: {
        ...estimateBlockProps,
        layout: 'accountOrderOnly',
      },
    };
  }, [
    activeAddendumSlot,
    estimateBlockProps,
    form.addendumDocumentDates,
    form.addendumSlots,
    form.contract.discountPercent,
    patchAddendumDocumentDate,
    patchAddendumSlotField,
  ]);

  const lockedHint =
    activeAddendumSlot !== null && !contractAndEstimateLocked
      ? `Прикрепление расчётов к доп. соглашению доступно после статуса «Договор подписан» в «${PACKAGE_HUB_MODAL_TITLE}».`
      : null;

  return {
    estimateBlockProps,
    windowsAddendumTabProps,
    lockedHint,
  };
}
