'use client';

import { BanknotesIcon } from '@heroicons/react/24/outline';

import { useEffect, useRef, useState } from 'react';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/AddCrmCustomerModal.module.css';
import crmDetailStyles from '@/views/admin/CRM/Customers/CrmCustomerDetailModal.module.css';

import styles from '../ContractDocuments.module.css';
import hubStyles from './RepairContractPackageHubModal.module.css';
import { RepairContractPackagePipelineSection } from './RepairContractPackagePipelineSection';
import { RepairContractPaymentsJournalModal } from './RepairContractPaymentsJournalModal';
import { RepairContractPaymentsTab } from './RepairContractPaymentsTab';
import { REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE } from './repairContractPackageHubConstants';
import { useRepairContractPackageHub } from './useRepairContractPackageHub';

export type RepairContractPackageHubModalProps = {
  packageId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  /** Блокировать этапы (например, несохранённые «Данные» в редакторе). */
  blockPipelineActions?: boolean;
  blockPipelineReason?: string;
};

export function RepairContractPackageHubModal({
  packageId,
  isOpen,
  onClose,
  onUpdated,
  blockPipelineActions = false,
  blockPipelineReason,
}: RepairContractPackageHubModalProps) {
  const hub = useRepairContractPackageHub({ packageId, isOpen, onUpdated });
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

  const modalTitle = (
    <span className={`${crmDetailStyles.titleWithEdit} ${hubStyles.modalTitleRow}`}>
      <span>{REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE}</span>
      {!hub.loading ? (
        <>
          <span className={hubStyles.modalContractNumber}>
            {hub.contractNumberLabel}
            {hub.headerConcludedDateLabel != null ? ` от ${hub.headerConcludedDateLabel}` : null}
          </span>
          <button
            type="button"
            className={crmDetailStyles.historyBtn}
            title="Журнал оплат"
            aria-label="Журнал оплат"
            onClick={() => setPaymentsJournalOpen(true)}
          >
            <BanknotesIcon className={crmDetailStyles.editIcon} aria-hidden />
          </button>
        </>
      ) : null}
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleCloseMain}
        title={modalTitle}
        size="lg"
        className={crmFormStyles.modalPanel}
        showCloseButton
      >
        {hub.loading ? <p data-modal-form-hint>Загрузка…</p> : null}
        {hub.error ? <p data-modal-form-error>{hub.error}</p> : null}
        {!hub.loading ? (
          <div
            className={`${crmFormStyles.formShell} ${hubStyles.hubFormShell}`}
            data-modal-form
            data-modal-density="compact"
          >
            <section
              data-modal-readonly-panel
              data-modal-density="compact"
              className={`${hubStyles.hubModalSection} ${hubStyles.pipelinePanel}`}
            >
              <div className={hubStyles.pipelineSectionHead}>
                <h3 className={crmDetailStyles.linkedSectionTitle}>Этапы и статусы договора</h3>
                {!hub.loading && !hub.pipeline.isRefused ? (
                  <button
                    type="button"
                    className={hubStyles.pipelineRefusalHeadBtn}
                    disabled={
                      blockPipelineActions ||
                      hub.savingPackageStatus ||
                      hub.workStartModalBusy ||
                      hub.contractCloseModalBusy ||
                      hub.refusalModalBusy
                    }
                    title={blockPipelineReason ?? (hub.loading ? 'Загрузка…' : undefined)}
                    onClick={() => {
                      hub.setRefusalModalError(null);
                      hub.setRefusalReasonDraft('');
                      hub.setRefusalModalOpen(true);
                    }}
                  >
                    Отказ по проекту
                  </button>
                ) : null}
              </div>
              <p className={hubStyles.pipelineIntro}>
                Последовательность этапов договора. Оплаты считаются по журналу; «В работе» — от{' '}
                {70}% по договору и акту начала работ; «Закрыт» — 100% оплата и акт сдачи-приёмки.
                Отказ возможен на любом этапе.
              </p>
              <RepairContractPackagePipelineSection
                hub={hub}
                blockPipelineActions={blockPipelineActions}
                blockPipelineReason={blockPipelineReason}
                onOpenPaymentsJournal={() => setPaymentsJournalOpen(true)}
                onScrollToConductPayment={scrollToConductPayment}
              />
            </section>

            <section
              data-modal-readonly-panel
              data-modal-density="compact"
              className={`${hubStyles.hubModalSection} ${hubStyles.summaryPanel}`}
            >
              <RepairContractPaymentsTab
                packageId={packageId}
                form={hub.form}
                layout="hub-summary"
                journalReloadToken={journalReloadToken}
                onError={hub.setError}
                onUpdateContract={hub.updateContract}
                onJournalChanged={handleJournalChanged}
              />
            </section>

            <section
              ref={conductPanelRef}
              data-modal-readonly-panel
              data-modal-density="compact"
              className={`${hubStyles.hubModalSection} ${hubStyles.conductPanel}`}
            >
              <RepairContractPaymentsTab
                packageId={packageId}
                form={hub.form}
                layout="hub-conduct"
                journalReloadToken={journalReloadToken}
                onError={hub.setError}
                onUpdateContract={hub.updateContract}
                onUpdateContractFields={hub.updateContractFields}
                onPrintCashOrder={hub.printCashOrder}
                onJournalChanged={handleJournalChanged}
              />
            </section>
          </div>
        ) : null}
      </Modal>

      {!hub.loading ? (
        <RepairContractPaymentsJournalModal
          packageId={packageId}
          form={hub.form}
          isOpen={paymentsJournalOpen}
          onClose={() => setPaymentsJournalOpen(false)}
          onError={hub.setError}
          onUpdateContract={hub.updateContract}
          onJournalChanged={handleJournalChanged}
        />
      ) : null}

      <ConfirmModal
        isOpen={hub.revertRefusalConfirmOpen}
        onClose={() => hub.setRevertRefusalConfirmOpen(false)}
        onConfirm={() => void hub.handleRevertRefusal()}
        title="Снять статус «Отказ»?"
        message="Пакет снова станет «в проекте», данные договора можно будет редактировать."
        confirmText={hub.savingPackageStatus ? 'Сохранение…' : 'Снять отказ'}
      />

      <Modal
        isOpen={hub.workStartModalOpen}
        onClose={() => {
          if (hub.workStartModalBusy) return;
          hub.setWorkStartModalOpen(false);
        }}
        title="Статус «В работе»"
        size="md"
        className={crmFormStyles.modalPanel}
        showCloseButton
        compactOnMobile
      >
        <div data-modal-form data-modal-density="compact">
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Укажите дату начала работ и приложите фото акта начала работ.
          </p>
          <div data-modal-form-grid className={styles.repairWorkStartModalTopGrid}>
            <div data-modal-form-group>
              <label htmlFor="hub_repair_work_start_act_date">Дата начала работ</label>
              <div className={styles.repairWorkStartModalDateFieldWrap}>
                <input
                  id="hub_repair_work_start_act_date"
                  type="date"
                  value={hub.workStartModalDate}
                  onChange={(e) => hub.setWorkStartModalDate(e.target.value)}
                  disabled={hub.workStartModalBusy}
                />
              </div>
            </div>
            <div data-modal-form-group>
              <label htmlFor="hub_repair_work_start_act_photo">Фото акта начала работ</label>
              <div className={styles.repairWorkStartModalFileRow}>
                <input
                  ref={workStartFileInputRef}
                  id="hub_repair_work_start_act_photo"
                  type="file"
                  className={styles.repairWorkStartModalFileInputSrOnly}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={hub.workStartModalBusy}
                  onChange={(e) => hub.setWorkStartModalFile(e.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor="hub_repair_work_start_act_photo"
                  data-modal-btn="secondary"
                  className={styles.repairWorkStartModalFilePickBtn}
                >
                  {hub.workStartModalFile ? 'Заменить файл' : 'Выберите файл'}
                </label>
              </div>
            </div>
          </div>
          {workStartFilePreview ? (
            <div className={styles.repairWorkStartModalPreview}>
              <img src={workStartFilePreview} alt="Предпросмотр" />
            </div>
          ) : null}
          {hub.workStartModalError ? (
            <p data-modal-form-error role="alert">
              {hub.workStartModalError}
            </p>
          ) : null}
          <div data-modal-form-actions>
            <button
              type="button"
              data-modal-btn="secondary"
              disabled={hub.workStartModalBusy}
              onClick={() => hub.setWorkStartModalOpen(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              data-modal-btn="primary"
              disabled={hub.workStartModalBusy}
              onClick={() => void hub.handleConfirmWorkStart()}
            >
              {hub.workStartModalBusy ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={hub.contractCloseModalOpen}
        onClose={() => {
          if (hub.contractCloseModalBusy) return;
          hub.setContractCloseModalOpen(false);
        }}
        title="Закрытие договора"
        size="md"
        className={crmFormStyles.modalPanel}
        showCloseButton
        compactOnMobile
      >
        <div data-modal-form data-modal-density="compact">
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Укажите дату акта сдачи-приёмки и приложите фото акта.
          </p>
          <div data-modal-form-grid className={styles.repairWorkStartModalTopGrid}>
            <div data-modal-form-group>
              <label htmlFor="hub_repair_contract_close_act_date">Дата акта сдачи-приёмки</label>
              <div className={styles.repairWorkStartModalDateFieldWrap}>
                <input
                  id="hub_repair_contract_close_act_date"
                  type="date"
                  value={hub.contractCloseModalDate}
                  onChange={(e) => hub.setContractCloseModalDate(e.target.value)}
                  disabled={hub.contractCloseModalBusy}
                />
              </div>
            </div>
            <div data-modal-form-group>
              <label htmlFor="hub_repair_contract_close_act_photo">Фото акта сдачи-приёмки</label>
              <div className={styles.repairWorkStartModalFileRow}>
                <input
                  ref={contractCloseFileInputRef}
                  id="hub_repair_contract_close_act_photo"
                  type="file"
                  className={styles.repairWorkStartModalFileInputSrOnly}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={hub.contractCloseModalBusy}
                  onChange={(e) => hub.setContractCloseModalFile(e.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor="hub_repair_contract_close_act_photo"
                  data-modal-btn="secondary"
                  className={styles.repairWorkStartModalFilePickBtn}
                >
                  {hub.contractCloseModalFile ? 'Заменить файл' : 'Выберите файл'}
                </label>
              </div>
            </div>
          </div>
          {contractCloseFilePreview ? (
            <div className={styles.repairWorkStartModalPreview}>
              <img src={contractCloseFilePreview} alt="Предпросмотр" />
            </div>
          ) : null}
          {hub.contractCloseModalError ? (
            <p data-modal-form-error role="alert">
              {hub.contractCloseModalError}
            </p>
          ) : null}
          <div data-modal-form-actions>
            <button
              type="button"
              data-modal-btn="secondary"
              disabled={hub.contractCloseModalBusy}
              onClick={() => hub.setContractCloseModalOpen(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              data-modal-btn="primary"
              disabled={hub.contractCloseModalBusy}
              onClick={() => void hub.handleConfirmContractClose()}
            >
              {hub.contractCloseModalBusy ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={hub.refusalModalOpen}
        onClose={() => {
          if (hub.refusalModalBusy) return;
          hub.setRefusalModalOpen(false);
          hub.setRefusalModalError(null);
        }}
        title="Отказ по проекту договора"
        size="md"
        className={crmFormStyles.modalPanel}
        showCloseButton
        compactOnMobile
      >
        <div data-modal-form data-modal-density="compact">
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Укажите причину отказа — она сохранится вместе со статусом «Отказ».
          </p>
          <div data-modal-form-group>
            <label htmlFor="hub_repair_contract_refusal_reason">Причина отказа</label>
            <textarea
              id="hub_repair_contract_refusal_reason"
              className={styles.repairContractRefusalReasonTextarea}
              rows={5}
              value={hub.refusalReasonDraft}
              onChange={(e) => hub.setRefusalReasonDraft(e.target.value)}
              disabled={hub.refusalModalBusy}
            />
          </div>
          {hub.refusalModalError ? (
            <p data-modal-form-error role="alert">
              {hub.refusalModalError}
            </p>
          ) : null}
          <div data-modal-form-actions>
            <button
              type="button"
              data-modal-btn="secondary"
              disabled={hub.refusalModalBusy}
              onClick={() => hub.setRefusalModalOpen(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              data-modal-btn="primary"
              disabled={hub.refusalModalBusy}
              onClick={() => void hub.handleConfirmContractRefusal()}
            >
              {hub.refusalModalBusy ? 'Сохранение…' : 'Сохранить отказ'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={hub.repairActPhotosModalOpen}
        onClose={() => hub.setRepairActPhotosModalOpen(false)}
        title="Фото актов к статусам договора"
        size="lg"
        className={crmFormStyles.modalPanel}
        showCloseButton
        compactOnMobile
      >
        <div data-modal-form data-modal-density="compact">
          <div className={styles.repairAttachedActPhotosList}>
            {hub.attachedActPhotos.map((it) => (
              <section key={it.key} className={styles.repairAttachedActPhotoBlock}>
                <h3 className={styles.repairAttachedActPhotoTitle}>{it.title}</h3>
                <p className={styles.repairAttachedActPhotoMeta}>
                  Дата по акту: <strong>{it.dateLabel}</strong>
                </p>
                <div className={styles.repairWorkStartModalPreview}>
                  <a
                    href={it.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.repairAttachedActPhotoImageLink}
                  >
                    <img src={it.src} alt={it.title} />
                  </a>
                </div>
              </section>
            ))}
          </div>
          <div data-modal-form-actions>
            <button
              type="button"
              data-modal-btn="primary"
              onClick={() => hub.setRepairActPhotosModalOpen(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
