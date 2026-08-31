import { useMemo, useState } from 'react';

import type {
  ContractDocumentPackage,
  ContractDocumentPackageKind,
} from '@/shared/api/admin-contract-document-packages';

import type { ContractsListActPhotoItem } from '../contractsListActPhotos';

export function useContractsListModalsState() {
  const [creating, setCreating] = useState(false);
  const [createDirectionModalOpen, setCreateDirectionModalOpen] = useState(false);
  const [createDirectionBusyKind, setCreateDirectionBusyKind] =
    useState<ContractDocumentPackageKind | null>(null);
  const [copyingPackageId, setCopyingPackageId] = useState<string | null>(null);
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);
  const [packagePendingDelete, setPackagePendingDelete] = useState<ContractDocumentPackage | null>(
    null
  );
  const [trashOpen, setTrashOpen] = useState(false);
  const [packageHubPackageId, setPackageHubPackageId] = useState<string | null>(null);
  const [invoicesHubPackageId, setInvoicesHubPackageId] = useState<string | null>(null);
  const [workOrdersHubPackageId, setWorkOrdersHubPackageId] = useState<string | null>(null);
  const [customerSharePackageId, setCustomerSharePackageId] = useState<string | null>(null);
  const [remoteSigningPackageId, setRemoteSigningPackageId] = useState<string | null>(null);
  const [actPhotosModal, setActPhotosModal] = useState<{
    items: ContractsListActPhotoItem[];
    contractLabel: string;
  } | null>(null);

  const actionsBusy = useMemo(
    () => creating || copyingPackageId !== null || deletingPackageId !== null,
    [creating, copyingPackageId, deletingPackageId]
  );

  return {
    creating,
    setCreating,
    createDirectionModalOpen,
    setCreateDirectionModalOpen,
    createDirectionBusyKind,
    setCreateDirectionBusyKind,
    copyingPackageId,
    setCopyingPackageId,
    deletingPackageId,
    setDeletingPackageId,
    packagePendingDelete,
    setPackagePendingDelete,
    trashOpen,
    setTrashOpen,
    packageHubPackageId,
    setPackageHubPackageId,
    invoicesHubPackageId,
    setInvoicesHubPackageId,
    workOrdersHubPackageId,
    setWorkOrdersHubPackageId,
    customerSharePackageId,
    setCustomerSharePackageId,
    remoteSigningPackageId,
    setRemoteSigningPackageId,
    actPhotosModal,
    setActPhotosModal,
    actionsBusy,
  };
}

export type ContractsListModalsState = ReturnType<typeof useContractsListModalsState>;
