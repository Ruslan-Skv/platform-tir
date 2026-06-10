'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { ContractDocumentPackageStatus } from '@/shared/api/admin-contract-document-packages';
import { updateContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';

import type { RepairPackageFormData } from '../../directions/repair/repairPackageForm';
import {
  type PackageJournalScheduler,
  createPackageJournalScheduler,
} from '../../shared/repairPackageJournalSchedule';

type RepairPackageListRow = {
  id: string;
  title: string | null;
  formData: Record<string, unknown>;
};

export type UsePackageDocumentPersistOptions = {
  packageId: string;
  loading: boolean;
  packageFlowStatusRef: React.MutableRefObject<ContractDocumentPackageStatus>;
  formRef: React.MutableRefObject<RepairPackageFormData>;
  draftTitleRef: React.MutableRefObject<string>;
  dirtyRef: React.MutableRefObject<boolean>;
  buildPersistedFormData: (form: RepairPackageFormData) => Record<string, unknown>;
  setForm: React.Dispatch<React.SetStateAction<RepairPackageFormData>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setRepairPackages: React.Dispatch<React.SetStateAction<RepairPackageListRow[]>>;
  isVersionsHistoryOpenRef: React.MutableRefObject<boolean>;
  refreshPackageVersionsRef: React.MutableRefObject<
    (opts?: { skipSpinner?: boolean }) => Promise<void>
  >;
};

export function usePackageDocumentPersist({
  packageId,
  loading,
  packageFlowStatusRef,
  formRef,
  draftTitleRef,
  dirtyRef,
  buildPersistedFormData,
  setForm,
  setDirty,
  setError,
  setRepairPackages,
  isVersionsHistoryOpenRef,
  refreshPackageVersionsRef,
}: UsePackageDocumentPersistOptions) {
  const persistDebounceRef = useRef<number | null>(null);
  const journalSchedulerRef = useRef<PackageJournalScheduler | null>(null);

  useEffect(() => {
    journalSchedulerRef.current = createPackageJournalScheduler({
      packageId,
      getPayload: () => ({
        title: draftTitleRef.current.trim() || null,
        formData: buildPersistedFormData(formRef.current),
      }),
      onFlushed: () => {
        if (isVersionsHistoryOpenRef.current) {
          void refreshPackageVersionsRef.current({ skipSpinner: true });
        }
      },
    });
    return () => {
      journalSchedulerRef.current?.dispose();
      journalSchedulerRef.current = null;
    };
  }, [
    packageId,
    buildPersistedFormData,
    draftTitleRef,
    formRef,
    isVersionsHistoryOpenRef,
    refreshPackageVersionsRef,
  ]);

  useEffect(() => {
    return () => {
      if (persistDebounceRef.current !== null) {
        window.clearTimeout(persistDebounceRef.current);
        persistDebounceRef.current = null;
      }
    };
  }, [packageId]);

  const persistPackageForm = useCallback(
    async (nextForm: RepairPackageFormData, opts?: { recordVersion?: boolean }) => {
      const formData = buildPersistedFormData(nextForm);
      const recordVersion = opts?.recordVersion === true;
      await updateContractDocumentPackage(packageId, {
        title: draftTitleRef.current.trim() || null,
        formData,
        recordVersion,
      });
      if (recordVersion) {
        journalSchedulerRef.current?.acknowledgeImmediateVersion();
        if (isVersionsHistoryOpenRef.current) {
          void refreshPackageVersionsRef.current({ skipSpinner: true });
        }
      } else {
        journalSchedulerRef.current?.schedule();
      }
      setForm(nextForm);
      formRef.current = nextForm;
      setDirty(false);
      setRepairPackages((prev) => prev.map((p) => (p.id === packageId ? { ...p, formData } : p)));
    },
    [
      packageId,
      buildPersistedFormData,
      draftTitleRef,
      formRef,
      isVersionsHistoryOpenRef,
      refreshPackageVersionsRef,
      setDirty,
      setForm,
      setRepairPackages,
    ]
  );

  const flushPersistDebounced = useCallback(async (): Promise<void> => {
    const hadPendingTimer = persistDebounceRef.current !== null;
    if (hadPendingTimer && persistDebounceRef.current !== null) {
      window.clearTimeout(persistDebounceRef.current);
      persistDebounceRef.current = null;
    }
    if (loading || packageFlowStatusRef.current === 'REFUSED') return;
    if (!hadPendingTimer && !dirtyRef.current) return;
    const formData = buildPersistedFormData(formRef.current);
    await updateContractDocumentPackage(packageId, {
      title: draftTitleRef.current.trim() || null,
      formData,
      recordVersion: false,
    });
    journalSchedulerRef.current?.schedule();
    setDirty(false);
    setRepairPackages((prev) => prev.map((p) => (p.id === packageId ? { ...p, formData } : p)));
  }, [
    loading,
    packageId,
    buildPersistedFormData,
    packageFlowStatusRef,
    dirtyRef,
    formRef,
    draftTitleRef,
    setDirty,
    setRepairPackages,
  ]);

  const schedulePersistDebounced = useCallback(() => {
    if (loading) return;
    if (persistDebounceRef.current !== null) {
      window.clearTimeout(persistDebounceRef.current);
    }
    persistDebounceRef.current = window.setTimeout(() => {
      persistDebounceRef.current = null;
      void flushPersistDebounced().catch((e) => {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить данные пакета');
      });
    }, 300);
  }, [loading, flushPersistDebounced, setError]);

  const touchPackageData = useCallback(() => {
    if (packageFlowStatusRef.current === 'REFUSED') return;
    setDirty(true);
    schedulePersistDebounced();
  }, [packageFlowStatusRef, schedulePersistDebounced, setDirty]);

  return {
    persistPackageForm,
    flushPersistDebounced,
    schedulePersistDebounced,
    touchPackageData,
  };
}
