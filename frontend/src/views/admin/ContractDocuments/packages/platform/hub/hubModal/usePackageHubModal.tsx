'use client';

import { BanknotesIcon } from '@heroicons/react/24/outline';

import { useEffect, useRef, useState } from 'react';

import crmDetailStyles from '@/views/admin/CRM/Customers/CrmCustomerDetailModal.module.css';

import type { PackageHubModalProps } from './PackageHubModal';
import hubStyles from './PackageHubModal.module.css';
import { PACKAGE_HUB_MODAL_TITLE } from './packageHubConstants';
import { usePackageHub } from './usePackageHub';

export function usePackageHubModal({
  packageId,
  isOpen,
  onClose,
  onUpdated,
  contractNumberLabel: contractNumberLabelFromEditor,
  headerConcludedDateLabel: headerConcludedDateFromEditor,
  getLiveForm,
  getLivePersistOptions,
  blockPipelineActions = false,
  blockPipelineReason,
}: PackageHubModalProps) {
  const hub = usePackageHub({
    packageId,
    isOpen,
    onUpdated,
    getLiveForm,
    getLivePersistOptions,
  });
  const workStartFileInputRef = useRef<HTMLInputElement>(null);
  const contractCloseFileInputRef = useRef<HTMLInputElement>(null);
  const [workStartFilePreview, setWorkStartFilePreview] = useState<string | null>(null);
  const [contractCloseFilePreview, setContractCloseFilePreview] = useState<string | null>(null);
  const [paymentsJournalOpen, setPaymentsJournalOpen] = useState(false);
  const [journalReloadToken, setJournalReloadToken] = useState(0);
  const conductPanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) setPaymentsJournalOpen(false);
  }, [isOpen]);

  const handleJournalChanged = () => {
    void hub.refreshJournalPaidRub();
    setJournalReloadToken((t) => t + 1);
  };

  const scrollToConductPayment = () => {
    conductPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (!hub.workStartModalFile) {
      setWorkStartFilePreview(null);
      return;
    }
    const u = URL.createObjectURL(hub.workStartModalFile);
    setWorkStartFilePreview(u);
    return () => URL.revokeObjectURL(u);
  }, [hub.workStartModalFile]);

  useEffect(() => {
    if (!hub.contractCloseModalFile) {
      setContractCloseFilePreview(null);
      return;
    }
    const u = URL.createObjectURL(hub.contractCloseModalFile);
    setContractCloseFilePreview(u);
    return () => URL.revokeObjectURL(u);
  }, [hub.contractCloseModalFile]);

  const titleContractNumber = contractNumberLabelFromEditor?.trim() || hub.contractNumberLabel;
  const titleConcludedDate = headerConcludedDateFromEditor ?? hub.headerConcludedDateLabel;

  const modalTitle = (
    <span className={`${crmDetailStyles.titleWithEdit} ${hubStyles.modalTitleRow}`}>
      <span>{PACKAGE_HUB_MODAL_TITLE}</span>
      {titleContractNumber ? (
        <span className={hubStyles.modalContractNumber}>
          {titleContractNumber}
          {titleConcludedDate != null ? ` от ${titleConcludedDate}` : null}
        </span>
      ) : (
        <span className={hubStyles.modalContractNumberPlaceholder} aria-hidden>
          —
        </span>
      )}
      <button
        type="button"
        className={crmDetailStyles.historyBtn}
        title="Журнал оплат"
        aria-label="Журнал оплат"
        disabled={hub.loading && !hub.contentReady}
        onClick={() => setPaymentsJournalOpen(true)}
      >
        <BanknotesIcon className={crmDetailStyles.editIcon} aria-hidden />
      </button>
    </span>
  );

  const handleCloseMain = () => {
    if (
      hub.workStartModalBusy ||
      hub.contractCloseModalBusy ||
      hub.refusalModalBusy ||
      hub.savingPackageStatus
    ) {
      return;
    }
    onClose();
  };

  return {
    packageId,
    isOpen,
    blockPipelineActions,
    blockPipelineReason,
    hub,
    workStartFileInputRef,
    contractCloseFileInputRef,
    conductPanelRef,
    workStartFilePreview,
    contractCloseFilePreview,
    paymentsJournalOpen,
    setPaymentsJournalOpen,
    journalReloadToken,
    handleJournalChanged,
    scrollToConductPayment,
    handleCloseMain,
    modalTitle,
  };
}

export type PackageHubModalModel = ReturnType<typeof usePackageHubModal>;
