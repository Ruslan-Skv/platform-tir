import { useCallback, useMemo } from 'react';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import type {
  ContractDocumentPackage,
  ContractDocumentPackageKind,
} from '@/shared/api/admin-contract-document-packages';
import {
  createContractDocumentPackage,
  getContractDocumentPackage,
  trashContractDocumentPackage,
} from '@/shared/api/admin-contract-document-packages';
import { adminContractDocumentsContractsPackageHref } from '@/views/admin/ContractDocuments/packages/config/contractDocumentsContractsRoutes';

import { buildFormDataForPackageCopy } from '../../../../platform/form/clonePackageFormDataForCopy';
import {
  REPAIR_COPY_CONTRACT_NUMBER_BASELINE_KEY,
  getDisplayContractNumber,
} from '../../../../platform/form/packageContractDisplay';
import { isPackageDraftDeletionAllowed } from '../contractsListUtils';
import type { ContractsListModalsState } from './useContractsListModalsState';

export type UseContractsListMutationsParams = {
  router: AppRouterInstance;
  load: () => Promise<void>;
  setError: (message: string | null) => void;
  modals: ContractsListModalsState;
};

export function useContractsListMutations({
  router,
  load,
  setError,
  modals,
}: UseContractsListMutationsParams) {
  const { canEdit } = useAdminSectionCanEdit();
  const {
    setCreating,
    setCreateDirectionModalOpen,
    setCreateDirectionBusyKind,
    setCopyingPackageId,
    setDeletingPackageId,
    setPackagePendingDelete,
    packagePendingDelete,
  } = modals;

  const handleCreate = useCallback(
    async (kind: ContractDocumentPackageKind) => {
      if (!canEdit) return;
      setCreating(true);
      setCreateDirectionBusyKind(kind);
      setError(null);
      try {
        const created = await createContractDocumentPackage({
          kind,
          title: undefined,
          formData: {},
        });
        setCreateDirectionModalOpen(false);
        router.push(adminContractDocumentsContractsPackageHref(created.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось создать');
      } finally {
        setCreateDirectionBusyKind(null);
        setCreating(false);
      }
    },
    [
      canEdit,
      router,
      setCreating,
      setCreateDirectionBusyKind,
      setCreateDirectionModalOpen,
      setError,
    ]
  );

  const handleCopyPackage = useCallback(
    async (packageId: string) => {
      if (!canEdit) return;
      setCopyingPackageId(packageId);
      setError(null);
      try {
        const pkg = await getContractDocumentPackage(packageId);
        const formDataBase = buildFormDataForPackageCopy(pkg.formData);
        const contractRaw = formDataBase.contract;
        const baselineNumber =
          contractRaw &&
          typeof contractRaw === 'object' &&
          !Array.isArray(contractRaw) &&
          typeof (contractRaw as Record<string, unknown>).number === 'string'
            ? String((contractRaw as Record<string, unknown>).number).trim()
            : '';
        const formData = {
          ...formDataBase,
          [REPAIR_COPY_CONTRACT_NUMBER_BASELINE_KEY]: baselineNumber,
        };
        const baseTitle = pkg.title?.trim();
        const created = await createContractDocumentPackage({
          kind: 'REPAIR',
          title: baseTitle ? `${baseTitle} (копия)` : undefined,
          formData,
        });
        await load();
        router.push(adminContractDocumentsContractsPackageHref(created.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось скопировать договор');
      } finally {
        setCopyingPackageId(null);
      }
    },
    [canEdit, load, router, setCopyingPackageId, setError]
  );

  const requestDeletePackage = useCallback(
    (pkg: ContractDocumentPackage) => {
      if (!canEdit || !isPackageDraftDeletionAllowed(pkg)) return;
      setPackagePendingDelete(pkg);
    },
    [canEdit, setPackagePendingDelete]
  );

  const handleConfirmDeletePackage = useCallback(() => {
    const pkg = packagePendingDelete;
    if (!pkg?.id || !canEdit) return;
    const id = pkg.id;
    void (async () => {
      setDeletingPackageId(id);
      setError(null);
      try {
        await trashContractDocumentPackage(id);
        setPackagePendingDelete(null);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось переместить договор в корзину');
      } finally {
        setDeletingPackageId(null);
      }
    })();
  }, [
    canEdit,
    load,
    packagePendingDelete,
    setDeletingPackageId,
    setError,
    setPackagePendingDelete,
  ]);

  const deleteConfirmMessage = useMemo(
    () =>
      packagePendingDelete != null
        ? (() => {
            const n = getDisplayContractNumber({
              formData: (packagePendingDelete.formData ?? {}) as Record<string, unknown>,
            });
            const suffix = n && String(n).trim() !== '' && n !== '—' ? ` «${n}»` : '';
            return `Переместить договор${suffix} в корзину? Он исчезнет из списка, восстановить можно из корзины.`;
          })()
        : '',
    [packagePendingDelete]
  );

  return {
    handleCreate,
    handleCopyPackage,
    requestDeletePackage,
    handleConfirmDeletePackage,
    deleteConfirmMessage,
  };
}
