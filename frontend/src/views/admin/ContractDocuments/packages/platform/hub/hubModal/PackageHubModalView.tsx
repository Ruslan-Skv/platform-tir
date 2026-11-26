'use client';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import { PACKAGE_TAB_HEAD_ROW_ACTIONS } from '../../ui/packageTabClassNames';
import { PackageRemoteSigningTimeline } from '../events/PackageRemoteSigningTimeline';
import { PackageContractPaymentsJournalModal } from '../payments/PackageContractPaymentsJournalModal';
import { PackageContractPaymentsTab } from '../payments/PackageContractPaymentsTab';
import { PackagePipelineSection } from '../pipeline/PackagePipelineSection';
import { PackageHubActPhotosModal } from './PackageHubActPhotosModal';
import { PackageHubContractCloseModal } from './PackageHubContractCloseModal';
import hubStyles from './PackageHubModal.module.css';
import { PackageHubPaymentProofsModal } from './PackageHubPaymentProofsModal';
import { PackageHubRefusalModal } from './PackageHubRefusalModal';
import { PackageHubWorkStartModal } from './PackageHubWorkStartModal';
import {
  HUB_BTN,
  HUB_BTN_DANGER,
  HUB_CARD,
  HUB_FORM_GRID,
  HUB_ROOT,
  HUB_SECTION,
  HUB_SECTION_HEAD,
  HUB_SECTION_HINT,
  HUB_SECTION_TITLE,
} from './packageHubModalStyles';
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
        className={`${crmFormStyles.modalPanel} ${hubStyles.modalPanel}`}
        contentClassName={hubStyles.modalContent}
        showCloseButton
        compactOnMobile
      >
        {hub.error ? <p data-modal-form-error>{hub.error}</p> : null}
        <div
          className={`${hubStyles.hubFormShell} ${
            hub.loading && !hub.contentReady ? hubStyles.hubFormShellLoading : ''
          }`}
          aria-busy={hub.loading && !hub.contentReady}
        >
          {hub.loading && !hub.contentReady ? (
            <p className={hubStyles.hubLoadingOverlay} data-modal-form-hint>
              Загрузка…
            </p>
          ) : null}
          {hub.contentReady ? (
            <div className={HUB_ROOT}>
              <div className={HUB_FORM_GRID}>
                <div className={HUB_CARD}>
                  <div className={HUB_SECTION}>
                    <div className={HUB_SECTION_HEAD}>
                      <h3 className={HUB_SECTION_TITLE}>Этапы и статусы договора</h3>
                      {!hub.loading && !hub.pipeline.isRefused ? (
                        <div className={PACKAGE_TAB_HEAD_ROW_ACTIONS}>
                          <button
                            type="button"
                            className={`${HUB_BTN} ${HUB_BTN_DANGER}`}
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
                        </div>
                      ) : null}
                    </div>
                    <p className={HUB_SECTION_HINT}>
                      {isProductDirectionPackageKind(hub.packageKind) ? (
                        <>
                          Этапы «Окна»: подписание договора, при необходимости — Д/с, предоплата не
                          менее 70% (срок по договору и статус «В работе» с даты этой оплаты в
                          журнале), 100% оплата, акт приёмки-передачи. Отказ возможен на любом
                          этапе.
                        </>
                      ) : (
                        <>
                          Последовательность этапов договора. Оплаты считаются по журналу; «В
                          работе» — от 70% по договору и акту начала работ; «Закрыт» — 100% оплата и
                          акт сдачи-приёмки. Отказ возможен на любом этапе.
                        </>
                      )}
                    </p>
                    {isProductDirectionPackageKind(hub.packageKind) && !hub.pipeline.isRefused ? (
                      <div className={hubStyles.windowsDeadlinePanel} role="note">
                        <div className={hubStyles.windowsDeadlineTitle}>
                          Срок по договору (расчёт)
                        </div>
                        {hub.pipeline.windowsContractDeadline ? (
                          <dl className={hubStyles.windowsDeadlineGrid}>
                            <div className={hubStyles.windowsDeadlineRow}>
                              <dt>Дата предоплаты 70%</dt>
                              <dd>{hub.pipeline.windowsContractDeadline.startLabelRu}</dd>
                            </div>
                            <div className={hubStyles.windowsDeadlineRow}>
                              <dt>Срок по договору</dt>
                              <dd>
                                {hub.pipeline.windowsContractDeadline.workingDays} раб. дн. (без
                                субботы и воскресенья)
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
                            Расчётная дата окончания появится после проведения предоплаты не менее
                            70% в журнале оплат (и при указанном сроке по договору в рабочих днях).
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
                    <PackageRemoteSigningTimeline
                      packageId={packageId}
                      reloadToken={journalReloadToken}
                      onError={hub.setError}
                    />
                  </div>

                  <div className={HUB_SECTION}>
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
                  </div>

                  <div ref={conductPanelRef} className={`${HUB_SECTION} ${hubStyles.conductPanel}`}>
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
                  </div>
                </div>
              </div>
            </div>
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

      {hub.contentReady ? <PackageHubPaymentProofsModal packageId={packageId} hub={hub} /> : null}

      <ConfirmModal
        isOpen={hub.revertRefusalConfirmOpen}
        onClose={() => hub.setRevertRefusalConfirmOpen(false)}
        onConfirm={() => void hub.handleRevertRefusal()}
        title="Снять статус «Отказ»?"
        message="Пакет снова станет «в проекте», данные договора можно будет редактировать."
        confirmText={hub.savingPackageStatus ? 'Сохранение…' : 'Снять отказ'}
      />

      <ConfirmModal
        isOpen={hub.revertAddendumPendingOrdinal !== null}
        onClose={() => {
          if (hub.revertAddendumBusy) return;
          hub.setRevertAddendumPendingOrdinal(null);
        }}
        onConfirm={() => void hub.confirmAddendumSigningRevert()}
        title="Отменить подписание доп. соглашения?"
        message={hub.revertAddendumConfirmMessage}
        confirmText={hub.revertAddendumBusy ? 'Отмена…' : 'Отменить подписание'}
        cancelText="Оставить подписанным"
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
