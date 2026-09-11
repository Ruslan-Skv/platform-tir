'use client';

import { BanknotesIcon } from '@heroicons/react/24/outline';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import hubStyles from '../hubModal/PackageHubModal.module.css';
import type { PackageHubState } from '../hubModal/usePackageHub';
import type {
  PackageContractPipelineModel,
  PackageContractPipelineStepView,
} from './packagePipeline';
import { PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT } from './packagePipeline';
import { payPctToneClass, stepStateClass } from './packagePipelineTimelineUtils';

type PackagePipelineStepCardProps = {
  step: PackageContractPipelineStepView;
  isLast: boolean;
  hub: PackageHubState;
  pipeline: PackageContractPipelineModel;
  actionsDisabled: boolean;
  actionsTitle: string | undefined;
  onOpenPaymentsJournal?: () => void;
  onScrollToConductPayment?: () => void;
};

export function PackagePipelineStepCard({
  step,
  isLast,
  hub,
  pipeline,
  actionsDisabled,
  actionsTitle,
  onOpenPaymentsJournal,
  onScrollToConductPayment,
}: PackagePipelineStepCardProps) {
  return (
    <li className={`${hubStyles.pipelineStepItem} ${stepStateClass(step.state)}`}>
      <div className={hubStyles.pipelineStepRail}>
        <span className={hubStyles.pipelineStepMarker} aria-hidden />
        {!isLast ? <span className={hubStyles.pipelineStepConnector} aria-hidden /> : null}
      </div>
      <div className={hubStyles.pipelineStepBody}>
        <div className={hubStyles.pipelineStepHeader}>
          <span className={hubStyles.pipelineStepTitle}>{step.label}</span>
          {step.state === 'current' ? (
            <span className={hubStyles.pipelineStepCurrentBadge}>Текущий этап</span>
          ) : null}
        </div>
        {step.detail ? <p className={hubStyles.pipelineStepDetail}>{step.detail}</p> : null}

        {step.id === 'in_project' && step.state === 'current' ? (
          <div className={hubStyles.pipelineStepActions}>
            <button
              type="button"
              data-modal-btn="secondary"
              disabled={actionsDisabled}
              title={actionsTitle}
              onClick={() => {
                hub.setRefusalModalError(null);
                hub.setRefusalReasonDraft('');
                hub.setRefusalModalOpen(true);
              }}
            >
              Отказ
            </button>
            {(() => {
              /** Договор «Ремонт» нельзя подписать без прикреплённой сметы (расчёта). */
              const needsEstimate =
                hub.packageKind === 'REPAIR' && !pipeline.contractEstimateAttached;
              return (
                <button
                  data-admin-mutation
                  type="button"
                  data-modal-btn="primary"
                  disabled={actionsDisabled || needsEstimate}
                  title={
                    needsEstimate
                      ? 'Сначала прикрепите смету (расчёт) — вкладка «Смета»'
                      : actionsTitle
                  }
                  onClick={() => void hub.handleMarkContractConcluded()}
                >
                  {hub.savingPackageStatus ? 'Сохранение…' : 'Договор подписан'}
                </button>
              );
            })()}
          </div>
        ) : null}

        {step.id === 'signed' &&
        pipeline.contractSignedRevertRemainingMs > 0 &&
        pipeline.canRevertContractConcluded ? (
          <div className={hubStyles.pipelineRevertBlock}>
            <p className={hubStyles.pipelineRevertHint}>
              <span
                className={hubStyles.pipelineRevertSpinner}
                role="status"
                aria-label="Идёт отсчёт 30 секунд на отмену"
              />
              Отменить подписание договора можно в течение{' '}
              {Math.ceil(pipeline.contractSignedRevertRemainingMs / 1000)} с
            </p>
            <button
              data-admin-mutation
              type="button"
              data-modal-btn="secondary"
              disabled={hub.savingPackageStatus}
              onClick={() => void hub.confirmRevertContractConcluded()}
            >
              {hub.savingPackageStatus ? 'Сохранение…' : 'Отменить подписание договора'}
            </button>
          </div>
        ) : null}

        {step.id === 'addendums' && pipeline.hasAddendumsInPackage ? (
          <div className={hubStyles.pipelineAddendumGrid}>
            {pipeline.addendumCards.map((card) => (
              <div
                key={`addendum-card-${card.ordinal}`}
                className={`${hubStyles.pipelineAddendumCard} ${
                  card.slotStatus === 'OPEN'
                    ? hubStyles.pipelineAddendumCardAttention
                    : hubStyles.pipelineAddendumCardSigned
                }`}
              >
                <div className={hubStyles.pipelineAddendumCardHead}>
                  <span className={hubStyles.pipelineAddendumCardTitle}>Д/с №{card.ordinal}</span>
                  <span
                    className={`${hubStyles.pipelinePayBadge} ${payPctToneClass(card.paidPct)}`}
                  >
                    {card.paidPct != null ? `Оплата ${card.paidPct}%` : 'Оплата —'}
                  </span>
                </div>
                <p className={hubStyles.pipelineAddendumCardStatus}>
                  {card.slotStatus === 'OPEN'
                    ? 'Не подписано'
                    : card.slotStatus === 'SIGNED'
                      ? 'Подписано'
                      : 'Подписано'}
                </p>
                {card.canSign ? (
                  <button
                    type="button"
                    data-modal-btn="secondary"
                    disabled={actionsDisabled}
                    title={actionsTitle}
                    onClick={() => void hub.markAddendumSlotSigned(card.slotIndex0)}
                  >
                    Д/с №{card.ordinal} подписано
                  </button>
                ) : null}
                {card.canUnmarkSigned ? (
                  <div className={hubStyles.pipelineRevertBlock}>
                    <button
                      type="button"
                      data-modal-btn="secondary"
                      disabled={hub.savingPackageStatus}
                      onClick={() => void hub.unmarkAddendumSlotSigned(card.slotIndex0)}
                    >
                      <span
                        className={hubStyles.pipelineRevertSpinner}
                        role="status"
                        aria-label="Идёт отсчёт 30 секунд на отмену"
                      />
                      Отменить подписание ({Math.ceil(card.signedRevertRemainingMs / 1000)} с)
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {step.id === 'payments' ? (
          <>
            <div className={hubStyles.pipelinePaymentsBadges}>
              <span
                className={`${hubStyles.pipelinePayBadge} ${payPctToneClass(pipeline.contractPaidPct)}`}
              >
                Оплата по договору{' '}
                {pipeline.contractPaidPct != null ? `${pipeline.contractPaidPct}%` : '—'}
              </span>
              {pipeline.addendumCards.map((card) => (
                <span
                  key={`pay-badge-ds-${card.ordinal}`}
                  className={`${hubStyles.pipelinePayBadge} ${payPctToneClass(card.paidPct)}`}
                >
                  Оплата по Д/с №{card.ordinal} {card.paidPct != null ? `${card.paidPct}%` : '—'}
                </span>
              ))}
              {pipeline.grandPaidPct != null ? (
                <span
                  className={`${hubStyles.pipelinePayBadge} ${hubStyles.pipelinePayBadgeMuted}`}
                >
                  Всего {pipeline.grandPaidPct}%
                </span>
              ) : null}
            </div>
            <div className={hubStyles.pipelineStepActions}>
              {onOpenPaymentsJournal ? (
                <button
                  type="button"
                  data-modal-btn="secondary"
                  className={hubStyles.pipelineJournalBtn}
                  onClick={onOpenPaymentsJournal}
                >
                  <BanknotesIcon width={18} height={18} aria-hidden />
                  Журнал оплат
                </button>
              ) : null}
              {onScrollToConductPayment && pipeline.packageFlowStatus === 'CONTRACT_CONCLUDED' ? (
                <button
                  data-admin-mutation
                  type="button"
                  className={hubStyles.pipelineConductLinkBtn}
                  onClick={onScrollToConductPayment}
                >
                  Провести оплату
                </button>
              ) : null}
            </div>
            {step.state === 'current' && !pipeline.allPaymentsComplete ? (
              <p className={hubStyles.pipelineStepHint}>
                Для этапа «Закрыт» нужна 100% оплата по договору
                {pipeline.hasAddendumsInPackage ? ' и по всем Д/с с расчётами' : ''}. Записи
                вносятся в журнал или через форму ниже.
              </p>
            ) : null}
            {step.state === 'current' &&
            !pipeline.workStartPaymentReady &&
            pipeline.packageFlowStatus === 'CONTRACT_CONCLUDED' ? (
              <p className={hubStyles.pipelineStepHint}>
                {isProductDirectionPackageKind(pipeline.packageKind) ? (
                  <>
                    Для «В работе» нужна предоплата не менее{' '}
                    {PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT}% от суммы договора (сейчас{' '}
                    {pipeline.grandPaidPct ?? pipeline.contractPaidPct ?? 0}%).
                  </>
                ) : (
                  <>
                    Для «В работе» по договору нужно не менее{' '}
                    {PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT}% (сейчас{' '}
                    {pipeline.contractPaidPct ?? 0}%).
                  </>
                )}
              </p>
            ) : null}
          </>
        ) : null}

        {step.id === 'work' &&
        hub.packageKind === 'REPAIR' &&
        step.state === 'current' &&
        !pipeline.workStarted ? (
          <div className={hubStyles.pipelineStepActions}>
            <button
              type="button"
              data-modal-btn="primary"
              disabled={actionsDisabled || !pipeline.workStartPaymentReady}
              title={
                !pipeline.workStartPaymentReady
                  ? `Нужна оплата по договору не менее ${PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT}% (сейчас ${pipeline.contractPaidPct ?? 0}%)`
                  : actionsTitle
              }
              onClick={() => {
                hub.setWorkStartModalError(null);
                hub.setWorkStartModalDate('');
                hub.setWorkStartModalFile(null);
                hub.setWorkStartModalOpen(true);
              }}
            >
              Зафиксировать «В работе»
            </button>
          </div>
        ) : null}

        {step.id === 'closed' && step.state === 'current' && !pipeline.contractClosed ? (
          <div className={hubStyles.pipelineStepActions}>
            <button
              type="button"
              data-modal-btn="primary"
              disabled={actionsDisabled || !pipeline.allPaymentsComplete}
              title={
                !pipeline.allPaymentsComplete
                  ? isProductDirectionPackageKind(pipeline.packageKind) &&
                    pipeline.hasAddendumsInPackage
                    ? 'Нужна 100% оплата по договору и всем Д/с'
                    : 'Нужна 100% оплата по договору и всем доп. соглашениям'
                  : actionsTitle
              }
              onClick={() => {
                hub.setContractCloseModalError(null);
                hub.setContractCloseModalDate('');
                hub.setContractCloseModalFile(null);
                hub.setContractCloseModalOpen(true);
              }}
            >
              Закрыть договор
            </button>
          </div>
        ) : null}

        {hub.attachedActPhotos.length > 0 &&
        (step.id === 'closed' || (step.id === 'work' && hub.packageKind === 'REPAIR')) &&
        (step.state === 'current' || step.state === 'completed') ? (
          <div className={hubStyles.pipelineStepActionsSecondary}>
            <button
              type="button"
              data-modal-btn="secondary"
              onClick={() => hub.setActPhotosModalOpen(true)}
            >
              Фото актов
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
