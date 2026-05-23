'use client';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/AddCrmCustomerModal.module.css';

import { RepairContractPaymentsTab } from './RepairContractPaymentsTab';
import type { RepairPackageFormData } from './repairPackageForm';

export type RepairContractPaymentsJournalModalProps = {
  packageId: string;
  form: RepairPackageFormData;
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onUpdateContract: <K extends keyof RepairPackageFormData['contract']>(
    key: K,
    value: string
  ) => void;
  onJournalChanged?: () => void;
};

export function RepairContractPaymentsJournalModal({
  packageId,
  form,
  isOpen,
  onClose,
  onError,
  onUpdateContract,
  onJournalChanged,
}: RepairContractPaymentsJournalModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Журнал оплат"
      size="lg"
      className={crmFormStyles.modalPanel}
      showCloseButton
    >
      <RepairContractPaymentsTab
        packageId={packageId}
        form={form}
        layout="journal"
        onError={onError}
        onUpdateContract={onUpdateContract}
        onJournalChanged={onJournalChanged}
      />
    </Modal>
  );
}
