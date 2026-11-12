'use client';

import cdBase from '../../../../styles/base.module.css';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import { PackageContractPaymentsConductFormSection } from './PackageContractPaymentsConductFormSection';
import { PackageContractPaymentsHubSummarySection } from './PackageContractPaymentsHubSummarySection';
import { PackageContractPaymentsJournalSection } from './PackageContractPaymentsJournalSection';
import type { PackageContractPaymentsTabModel } from './usePackageContractPaymentsTab';

export function PackageContractPaymentsTabView({
  packageKind,
  form,
  layout,
  onUpdateContract,
  onPrintCashOrder,
  activeManagerSubstitutions,
  rows,
  loading,
  cancelingPaymentId,
  cancelPayment,
  updatingPaymentId,
  updatePayment,
  saving,
  showHubSummary,
  showJournalTable,
  isHubSummaryLayout,
  isHubConductLayout,
  showConductForm,
  isHubPartLayout,
  draft,
  setDraft,
  newBasisDraft,
  setNewBasisDraft,
  hubBasisKey,
  conductAmount,
  setConductAmount,
  acceptedByUserId,
  setAcceptedByUserId,
  acceptorChoices,
  hubPaymentConductedNotice,
  addendumPaymentSummaries,
  paymentsContractDiscountPct,
  payableBreakdown,
  windowsCostBreakdown,
  paidAllocations,
  coverage,
  journalPaidRub,
  grandTotalRub,
  mainContractPctOfGrand,
  journalPaidPctOfGrand,
  balancePerJournalRub,
  balancePctOfGrand,
  hubConductDateReady,
  hubConductAllBasesDone,
  hubConductFormComplete,
  hubConductBasisReady,
  hubFixedBasisOptions,
  handleHubBasisChange,
  handleHubPrintCashOrder,
  handleAppendBasisOption,
  submitHubConductPayment,
  submitCreate,
  basisSelectOptionsCreate,
}: PackageContractPaymentsTabModel) {
  return (
    <div
      className={`${cdDataTab.blockData} ${cdProduct.blockData} ${cdProduct.dataCompact} ${cdBase.paymentsTab} ${cdDataTab.paymentsTab} ${
        layout === 'hub' ? cdBase.paymentsTabHub : ''
      } ${isHubPartLayout ? cdBase.paymentsTabHubPart : ''}`}
    >
      {activeManagerSubstitutions.length > 0 ? (
        <p className={cdProduct.hint} style={{ marginBottom: 10 }}>
          {activeManagerSubstitutions
            .map((s) =>
              s.status === 'active'
                ? `Подмена: за ${s.absentManager.name} до ${s.dateTo.split('-').reverse().join('.')} отвечает ${s.substituteManager.name}`
                : `С ${s.dateFrom.split('-').reverse().join('.')} договор подменяет ${s.substituteManager.name} (за ${s.absentManager.name})`
            )
            .join(' · ')}
          {' — оплаты и з/п по договору в этот период учитываются за подменяющего.'}
        </p>
      ) : null}
      {showHubSummary ? (
        <PackageContractPaymentsHubSummarySection
          packageKind={packageKind}
          form={form}
          loading={loading}
          isHubSummaryLayout={isHubSummaryLayout}
          addendumPaymentSummaries={addendumPaymentSummaries}
          paymentsContractDiscountPct={paymentsContractDiscountPct}
          payableBreakdown={payableBreakdown}
          windowsCostBreakdown={windowsCostBreakdown}
          paidAllocations={paidAllocations}
          coverage={coverage}
          journalPaidRub={journalPaidRub}
          grandTotalRub={grandTotalRub}
          mainContractPctOfGrand={mainContractPctOfGrand}
          journalPaidPctOfGrand={journalPaidPctOfGrand}
          balancePerJournalRub={balancePerJournalRub}
          balancePctOfGrand={balancePctOfGrand}
          rows={rows}
        />
      ) : null}
      {showConductForm ? (
        <PackageContractPaymentsConductFormSection
          isHubConductLayout={isHubConductLayout}
          hubPaymentConductedNotice={hubPaymentConductedNotice}
          draft={draft}
          setDraft={setDraft}
          hubBasisKey={hubBasisKey}
          conductAmount={conductAmount}
          setConductAmount={setConductAmount}
          acceptedByUserId={acceptedByUserId}
          setAcceptedByUserId={setAcceptedByUserId}
          acceptorChoices={acceptorChoices}
          hubConductDateReady={hubConductDateReady}
          hubConductAllBasesDone={hubConductAllBasesDone}
          hubConductFormComplete={hubConductFormComplete}
          hubConductBasisReady={hubConductBasisReady}
          hubFixedBasisOptions={hubFixedBasisOptions}
          handleHubBasisChange={handleHubBasisChange}
          handleHubPrintCashOrder={handleHubPrintCashOrder}
          submitHubConductPayment={submitHubConductPayment}
          saving={saving}
          onPrintCashOrder={onPrintCashOrder}
          form={form}
          onUpdateContract={onUpdateContract}
          newBasisDraft={newBasisDraft}
          setNewBasisDraft={setNewBasisDraft}
          basisSelectOptionsCreate={basisSelectOptionsCreate}
          handleAppendBasisOption={handleAppendBasisOption}
          submitCreate={submitCreate}
        />
      ) : null}
      {showJournalTable ? (
        <PackageContractPaymentsJournalSection
          layout={layout}
          loading={loading}
          rows={rows}
          grandTotalRub={grandTotalRub}
          packageKind={packageKind}
          cancelingPaymentId={cancelingPaymentId}
          cancelPayment={cancelPayment}
          updatingPaymentId={updatingPaymentId}
          updatePayment={updatePayment}
          acceptorChoices={acceptorChoices}
        />
      ) : null}
    </div>
  );
}
