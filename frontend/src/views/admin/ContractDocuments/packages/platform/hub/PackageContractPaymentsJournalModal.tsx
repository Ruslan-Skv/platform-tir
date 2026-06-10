'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/AddCrmCustomerModal.module.css';

import type { PackageFormData } from '../form/packageForm';
import { PackageContractPaymentsTab } from './PackageContractPaymentsTab';

export type PackageContractPaymentsJournalModalProps = {
  packageId: string;
  packageKind?: ContractDocumentPackageKind;
  form: PackageFormData;
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onUpdateContract: <K extends keyof PackageFormData['contract']>(key: K, value: string) => void;
  onJournalChanged?: () => void;
};

export function PackageContractPaymentsJournalModal({
  packageId,
  packageKind = 'REPAIR',
  form,
  isOpen,
  onClose,
  onError,
  onUpdateContract,
  onJournalChanged,
}: PackageContractPaymentsJournalModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Журнал оплат"
      size="lg"
      className={crmFormStyles.modalPanel}
      showCloseButton
    >
      <PackageContractPaymentsTab
        packageId={packageId}
        packageKind={packageKind}
        form={form}
        layout="journal"
        onError={onError}
        onUpdateContract={onUpdateContract}
        onJournalChanged={onJournalChanged}
      />
    </Modal>
  );
}
