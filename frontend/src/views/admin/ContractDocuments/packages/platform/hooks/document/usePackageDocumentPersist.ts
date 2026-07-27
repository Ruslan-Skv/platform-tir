'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { ContractDocumentPackageStatus } from '@/shared/api/admin-contract-document-packages';
import { updateContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';

import type { PackageFormData } from '../../form/packageForm';
import {
  type PackageJournalScheduler,
  createPackageJournalScheduler,
} from '../../packageJournalSchedule';

type PackageWorkspaceListRow = {
  id: string;
  title: string | null;
  formData: Record<string, unknown>;
};

export type UsePackageDocumentPersistOptions = {
  packageId: string;
  loading: boolean;
  packageFlowStatusRef: React.MutableRefObject<ContractDocumentPackageStatus>;
  formRef: React.MutableRefObject<PackageFormData>;
  draftTitleRef: React.MutableRefObject<string>;
  dirtyRef: React.MutableRefObject<boolean>;
  responsibleManagerIdRef: React.MutableRefObject<string | null>;
  buildPersistedFormData: (form: PackageFormData) => Record<string, unknown>;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setWorkspacePackages: React.Dispatch<React.SetStateAction<PackageWorkspaceListRow[]>>;
  isVersionsHistoryOpenRef: React.MutableRefObject<boolean>;
  refreshPackageVersionsRef: React.MutableRefObject<
    (opts?: { skipSpinner?: boolean }) => Promise<void>
  >;
};

function resolveResponsibleManagerIdForPersist(
  form: PackageFormData,
  currentResponsibleManagerId: string | null
): string | null {
  const fromSignatory = form.executor.signatoryCrmUserId?.trim() || '';
  if (fromSignatory) return fromSignatory;
  return currentResponsibleManagerId?.trim() || null;
}

export function usePackageDocumentPersist({
  packageId,
  loading,
  packageFlowStatusRef,
  formRef,
  draftTitleRef,
  dirtyRef,
  responsibleManagerIdRef,
  buildPersistedFormData,
  setForm,
  setDirty,
  setError,
  setWorkspacePackages,
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
        responsibleManagerId: resolveResponsibleManagerIdForPersist(
          formRef.current,
          responsibleManagerIdRef.current
        ),
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
    responsibleManagerIdRef,
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
    async (nextForm: PackageFormData, opts?: { recordVersion?: boolean }) => {
      const formData = buildPersistedFormData(nextForm);
      const recordVersion = opts?.recordVersion === true;
      const responsibleManagerId = resolveResponsibleManagerIdForPersist(
        nextForm,
        responsibleManagerIdRef.current
      );
      await updateContractDocumentPackage(packageId, {
        title: draftTitleRef.current.trim() || null,
        formData,
        responsibleManagerId,
        recordVersion,
      });
      responsibleManagerIdRef.current = responsibleManagerId;
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
      setWorkspacePackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, formData } : p))
      );
    },
    [
      packageId,
      buildPersistedFormData,
      draftTitleRef,
      formRef,
      responsibleManagerIdRef,
      isVersionsHistoryOpenRef,
      refreshPackageVersionsRef,
      setDirty,
      setForm,
      setWorkspacePackages,
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
    const responsibleManagerId = resolveResponsibleManagerIdForPersist(
      formRef.current,
      responsibleManagerIdRef.current
    );
    await updateContractDocumentPackage(packageId, {
      title: draftTitleRef.current.trim() || null,
      formData,
      responsibleManagerId,
      recordVersion: false,
    });
    responsibleManagerIdRef.current = responsibleManagerId;
    journalSchedulerRef.current?.schedule();
    setDirty(false);
    setWorkspacePackages((prev) => prev.map((p) => (p.id === packageId ? { ...p, formData } : p)));
  }, [
    loading,
    packageId,
    buildPersistedFormData,
    packageFlowStatusRef,
    dirtyRef,
    formRef,
    draftTitleRef,
    responsibleManagerIdRef,
    setDirty,
    setWorkspacePackages,
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
