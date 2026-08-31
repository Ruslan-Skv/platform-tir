'use client';

import { PackageIssueInvoiceIssueFormSection } from './PackageIssueInvoiceIssueFormSection';
import { PackageIssueInvoiceIssuedTableSection } from './PackageIssueInvoiceIssuedTableSection';
import type { PackageIssueInvoicePanelModel } from './usePackageIssueInvoicePanel';

export function PackageIssueInvoicePanelView({
  packageId,
  saving,
  showIssuedTable,
  onDownload,
  onReprint,
  onShare,
  invoiceDate,
  setInvoiceDate,
  invoiceNumber,
  setInvoiceNumber,
  basisKey,
  setBasisKey,
  basisOptions,
  amountDisplay,
  formComplete,
  isProductDirectionPackage,
  contractSourceSummaryHint,
  estimateLoadSource,
  setEstimateLoadSource,
  estimateSourceOptions,
  selectedEstimateSource,
  lineItems,
  lineDisplay,
  updateLine,
  addLine,
  resetAllLines,
  removeLine,
  loadLinesFromEstimate,
  issuedNotice,
  downloadBusy,
  handleIssue,
  handlePrint,
  handleDownloadDraft,
  handleReprintDownload,
  issuedRows,
}: PackageIssueInvoicePanelModel) {
  return (
    <>
      <PackageIssueInvoiceIssueFormSection
        packageId={packageId}
        saving={saving}
        showIssuedTable={showIssuedTable}
        onDownload={onDownload}
        invoiceDate={invoiceDate}
        setInvoiceDate={setInvoiceDate}
        invoiceNumber={invoiceNumber}
        setInvoiceNumber={setInvoiceNumber}
        basisKey={basisKey}
        setBasisKey={setBasisKey}
        basisOptions={basisOptions}
        amountDisplay={amountDisplay}
        formComplete={formComplete}
        isProductDirectionPackage={isProductDirectionPackage}
        contractSourceSummaryHint={contractSourceSummaryHint}
        estimateLoadSource={estimateLoadSource}
        setEstimateLoadSource={setEstimateLoadSource}
        estimateSourceOptions={estimateSourceOptions}
        selectedEstimateSource={selectedEstimateSource}
        lineItems={lineItems}
        lineDisplay={lineDisplay}
        updateLine={updateLine}
        addLine={addLine}
        resetAllLines={resetAllLines}
        removeLine={removeLine}
        loadLinesFromEstimate={loadLinesFromEstimate}
        issuedNotice={issuedNotice}
        downloadBusy={downloadBusy}
        handleIssue={handleIssue}
        handlePrint={handlePrint}
        handleDownloadDraft={handleDownloadDraft}
      />

      {showIssuedTable ? (
        <PackageIssueInvoiceIssuedTableSection
          issuedRows={issuedRows}
          onReprint={onReprint}
          onDownload={onDownload}
          downloadBusy={downloadBusy}
          handleReprintDownload={handleReprintDownload}
          onShare={onShare}
        />
      ) : null}
    </>
  );
}
