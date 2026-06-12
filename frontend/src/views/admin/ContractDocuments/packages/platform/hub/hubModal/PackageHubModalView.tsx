'use client';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import crmDetailStyles from '@/views/admin/CRM/Customers/modals/CrmCustomerDetailModal.module.css';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import { PackageContractPaymentsJournalModal } from '../payments/PackageContractPaymentsJournalModal';
import { PackageContractPaymentsTab } from '../payments/PackageContractPaymentsTab';
import { PackagePipelineSection } from '../pipeline/PackagePipelineSection';
import { PackageHubActPhotosModal } from './PackageHubActPhotosModal';
import { PackageHubContractCloseModal } from './PackageHubContractCloseModal';
import hubStyles from './PackageHubModal.module.css';
import { PackageHubRefusalModal } from './PackageHubRefusalModal';
import { PackageHubWorkStartModal } from './PackageHubWorkStartModal';
import type { PackageHubModalModel } from './usePackageHubModal';

export function PackageHubModalView({
  packageId,
  isOpen,
  blockPipelineActions,
  blockPipelineReason,
  hub,
  conductPanelRef,
  paymentsJournalOpen,
  setPaymentsJournalOpen,
  journalReloadToken,
  handleJournalChanged,
  scrollToConductPayment,
  handleCloseMain,
  modalTitle,
  workStartFileInputRef,
  workStartFilePreview,
  contractCloseFileInputRef,
  contractCloseFilePreview,
}: PackageHubModalModel) {
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
        {hub.error ? <p data-modal-form-error>{hub.error}</p> : null}
        <div
          className={`${crmFormStyles.formShell} ${hubStyles.hubFormShell} ${hub.loading && !hub.contentReady ? hubStyles.hubFormShellLoading : ''}`}
          data-modal-form
          data-modal-density="compact"
          aria-busy={hub.loading && !hub.contentReady}
        >
          {hub.loading && !hub.contentReady ? (
            <p className={hubStyles.hubLoadingOverlay} data-modal-form-hint>
              Загрузка…
            </p>
          ) : null}
          {hub.contentReady ? (
            <>
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
                  {isProductDirectionPackageKind(hub.packageKind) ? (
                    <>
                      Этапы «Окна»: подписание договора, при необходимости — Д/с, предоплата не
                      менее 70% (срок по договору и статус «В работе» с даты этой оплаты в журнале),
                      100% оплата, акт приёмки-передачи. Отказ возможен на любом этапе.
                    </>
                  ) : (
                    <>
                      Последовательность этапов договора. Оплаты считаются по журналу; «В работе» —
                      от {70}% по договору и акту начала работ; «Закрыт» — 100% оплата и акт
                      сдачи-приёмки. Отказ возможен на любом этапе.
                    </>
                  )}
                </p>
                {isProductDirectionPackageKind(hub.packageKind) && !hub.pipeline.isRefused ? (
                  <div className={hubStyles.windowsDeadlinePanel} role="note">
                    <div className={hubStyles.windowsDeadlineTitle}>Срок по договору (расчёт)</div>
                    {hub.pipeline.windowsContractDeadline ? (
                      <dl className={hubStyles.windowsDeadlineGrid}>
                        <div className={hubStyles.windowsDeadlineRow}>
                          <dt>Дата предоплаты 70%</dt>
                          <dd>{hub.pipeline.windowsContractDeadline.startLabelRu}</dd>
                        </div>
                        <div className={hubStyles.windowsDeadlineRow}>
                          <dt>Срок по договору</dt>
                          <dd>
                            {hub.pipeline.windowsContractDeadline.workingDays} раб. дн. (без субботы
                            и воскресенья)
                          </dd>
                        </div>
                        <div className={hubStyles.windowsDeadlineRow}>
                          <dt>Расчётная дата окончания</dt>
                          <dd className={hubStyles.windowsDeadlineDateValue}>
                            {hub.pipeline.windowsContractDeadline.labelRu}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className={hubStyles.windowsDeadlinePending}>
                        Расчётная дата окончания появится после проведения предоплаты не менее 70% в
                        журнале оплат (и при указанном сроке по договору в рабочих днях).
                      </p>
                    )}
                  </div>
                ) : null}
                <PackagePipelineSection
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
                <PackageContractPaymentsTab
                  packageId={packageId}
                  packageKind={hub.packageKind}
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
                <PackageContractPaymentsTab
                  packageId={packageId}
                  packageKind={hub.packageKind}
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
            </>
          ) : null}
        </div>
      </Modal>

      {hub.contentReady ? (
        <PackageContractPaymentsJournalModal
          packageId={packageId}
          packageKind={hub.packageKind}
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

      <PackageHubWorkStartModal
        hub={hub}
        workStartFileInputRef={workStartFileInputRef}
        workStartFilePreview={workStartFilePreview}
      />

      <PackageHubContractCloseModal
        hub={hub}
        contractCloseFileInputRef={contractCloseFileInputRef}
        contractCloseFilePreview={contractCloseFilePreview}
      />

      <PackageHubRefusalModal hub={hub} />

      <PackageHubActPhotosModal hub={hub} />
    </>
  );
}
