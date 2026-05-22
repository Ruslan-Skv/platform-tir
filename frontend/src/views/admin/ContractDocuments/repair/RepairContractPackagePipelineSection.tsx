'use client';

import styles from '../ContractDocuments.module.css';
import type { RepairContractPackageHubState } from './useRepairContractPackageHub';

type RepairContractPackagePipelineSectionProps = {
  hub: RepairContractPackageHubState;
  blockPipelineActions?: boolean;
  blockPipelineReason?: string;
};

export function RepairContractPackagePipelineSection({
  hub,
  blockPipelineActions = false,
  blockPipelineReason,
}: RepairContractPackagePipelineSectionProps) {
  const pipelineDisabled =
    blockPipelineActions ||
    hub.loading ||
    hub.savingPackageStatus ||
    hub.workStartModalBusy ||
    hub.contractCloseModalBusy ||
    hub.refusalModalBusy;

  const pipelineTitle = blockPipelineReason ?? (hub.loading ? 'Загрузка…' : undefined);

  return (
    <section className={styles.repairPackageHubPipelineSection}>
      <h3 className={styles.repairPackageHubSectionTitle}>Этапы и статусы договора</h3>
      <p className={styles.hint} style={{ marginTop: 0 }}>
        Те же действия, что в шапке редактора договора: подписание, отказ, начало и закрытие работ,
        подписание доп. соглашений.
      </p>

      <div className={styles.repairPackageHubPipelineBadges}>
        {hub.packageFlowStatus === 'REFUSED' ? (
          <span
            className={`${styles.packageFlowStatusBadge} ${styles.repairContractsListStatusBadgeRefused}`}
            role="status"
          >
            Отказ
          </span>
        ) : null}
        {hub.packageFlowStatus === 'CONTRACT_CONCLUDED' ? (
          <span className={styles.packageFlowSignedLabelGroup} role="status">
            <span className={styles.packageFlowStatusBadge}>Договор подписан</span>
            {hub.signedContractPayOrb != null ? (
              <span
                className={`${styles.packageFlowPayPctOrb} ${hub.signedContractPayOrb.toneClass}`}
                title={hub.signedContractPayOrb.title}
              >
                {hub.signedContractPayOrb.label}
              </span>
            ) : null}
            {hub.signedAddendumOrdinals.map((n) => (
              <span key={`hub-signed-${n}`} className={styles.packageFlowStatusBadge}>
                Д/с №{n} подписано
              </span>
            ))}
          </span>
        ) : null}
        {hub.isContractPaid ? (
          <span className={styles.packageFlowStatusBadge} role="status">
            Договор оплачен
          </span>
        ) : null}
        {hub.packageFlowStatus !== 'CONTRACT_CONCLUDED'
          ? hub.signedAddendumOrdinals.map((n) => (
              <span key={`hub-signed-out-${n}`} className={styles.packageFlowStatusBadge}>
                Д/с №{n} подписано
              </span>
            ))
          : null}
        {hub.paidAddendumOrdinals.map((n) => (
          <span key={`hub-paid-${n}`} className={styles.packageFlowStatusBadge}>
            Д/с №{n} оплачено
          </span>
        ))}
        {hub.repairWorkStarted ? (
          <span className={styles.packageFlowStatusBadge} role="status">
            В работе
          </span>
        ) : null}
        {hub.repairContractClosed ? (
          <span
            className={`${styles.packageFlowStatusBadge} ${styles.repairEditorHeaderClosedStatusBtn}`}
            role="status"
          >
            Договор закрыт
          </span>
        ) : null}
      </div>

      {hub.packageFlowStatus === 'REFUSED' ? (
        <div className={styles.repairPackageHubPipelineActions}>
          <p className={styles.hint} style={{ margin: 0 }}>
            {hub.form.contractRefusalReason.trim() || 'Причина отказа не указана.'}
          </p>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={hub.savingPackageStatus}
            onClick={() => hub.setRevertRefusalConfirmOpen(true)}
          >
            {hub.savingPackageStatus ? 'Сохранение…' : 'Снять отказ'}
          </button>
        </div>
      ) : (
        <div className={styles.repairPackageHubPipelineActions}>
          {hub.packageFlowStatus === 'IN_PROGRESS' ? (
            <>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={pipelineDisabled}
                title={pipelineTitle}
                onClick={() => {
                  hub.setRefusalModalError(null);
                  hub.setRefusalReasonDraft('');
                  hub.setRefusalModalOpen(true);
                }}
              >
                Отказ
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={pipelineDisabled}
                title={pipelineTitle}
                onClick={() => void hub.handleMarkContractConcluded()}
              >
                {hub.savingPackageStatus ? 'Сохранение…' : 'Договор подписан'}
              </button>
            </>
          ) : (
            <>
              {!hub.repairWorkStarted ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={pipelineDisabled}
                  title={pipelineTitle}
                  onClick={() => {
                    hub.setWorkStartModalError(null);
                    hub.setWorkStartModalDate('');
                    hub.setWorkStartModalFile(null);
                    hub.setWorkStartModalOpen(true);
                  }}
                >
                  В работе
                </button>
              ) : null}
              {hub.repairWorkStarted && !hub.repairContractClosed ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={pipelineDisabled}
                  title={pipelineTitle}
                  onClick={() => {
                    hub.setContractCloseModalError(null);
                    hub.setContractCloseModalDate('');
                    hub.setContractCloseModalFile(null);
                    hub.setContractCloseModalOpen(true);
                  }}
                >
                  Закрыть договор
                </button>
              ) : null}
            </>
          )}

          {hub.openAddendumSignActions.map(({ slotIndex0, ordinal, hasAnyAttachedPresets }) => (
            <button
              key={`hub-addendum-sign-${ordinal}`}
              type="button"
              className={styles.secondaryBtn}
              disabled={!hasAnyAttachedPresets || hub.refusalModalBusy || hub.savingPackageStatus}
              title={
                !hasAnyAttachedPresets ? 'Сначала прикрепите хотя бы один расчёт к Д/с' : undefined
              }
              onClick={() => void hub.markAddendumSlotSigned(slotIndex0)}
            >
              Д/с №{ordinal} подписано
            </button>
          ))}

          {hub.attachedActPhotos.length > 0 ? (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => hub.setRepairActPhotosModalOpen(true)}
            >
              Фото актов
            </button>
          ) : null}
        </div>
      )}

      {hub.packageFlowStatus === 'CONTRACT_CONCLUDED' ? (
        <div className={styles.repairPackageHubRevertRow}>
          {hub.isContractPaid ? (
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={hub.savingPackageStatus || !hub.canRevertContractPaid}
              title={
                hub.canRevertContractPaid
                  ? 'Снять статус «Договор оплачен»'
                  : 'Снять статус можно только в течение 24 часов после установки'
              }
              onClick={() => void hub.handleRevertContractPaid()}
            >
              {hub.savingPackageStatus ? 'Сохранение…' : 'Снять статус «Договор оплачен»'}
            </button>
          ) : null}
          {hub.contractSignedRevertRemainingMs > 0 ? (
            <div className={styles.contractSignedRevertUi}>
              <p className={styles.contractSignedRevertHint}>
                Отменить статус «Договор подписан» можно в течение 30 секунд
              </p>
              <button
                type="button"
                className={`${styles.secondaryBtn} ${styles.contractSignedRevertBtn}`}
                disabled={hub.savingPackageStatus}
                onClick={() => void hub.confirmRevertContractConcluded()}
              >
                {hub.savingPackageStatus ? 'Сохранение…' : 'Отменить подписание договора'}
              </button>
            </div>
          ) : null}
          {hub.addendumSignedRevertUis.map(({ slotIndex0, remainingMs }) => {
            const n = slotIndex0 + 1;
            return remainingMs > 0 ? (
              <div key={`hub-addendum-revert-${n}`} className={styles.contractSignedRevertUi}>
                <p className={styles.contractSignedRevertHint}>
                  Отменить подписание Д/с №{n} (осталось {Math.ceil(remainingMs / 1000)} с)
                </p>
                <button
                  type="button"
                  className={`${styles.secondaryBtn} ${styles.contractSignedRevertBtn}`}
                  disabled={hub.savingPackageStatus}
                  onClick={() => void hub.unmarkAddendumSlotSigned(slotIndex0)}
                >
                  {hub.savingPackageStatus ? 'Сохранение…' : `Отменить Д/с №${n}`}
                </button>
              </div>
            ) : null;
          })}
        </div>
      ) : null}
    </section>
  );
}
