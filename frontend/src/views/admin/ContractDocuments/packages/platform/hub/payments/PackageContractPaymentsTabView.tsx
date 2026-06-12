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
  rows,
  loading,
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
  hubPaymentConductedNotice,
  addendumPaymentSummaries,
  paymentsContractDiscountPct,
  payableBreakdown,
  windowsCostBreakdown,
  paidAllocations,
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
        />
      ) : null}
    </div>
  );
}
