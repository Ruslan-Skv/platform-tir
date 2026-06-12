import type { ContractDocumentPackagePayment } from '@/shared/api/admin-contract-document-packages';

export function computePackageIssueInvoicePaidAllocations(
  paymentRows: ContractDocumentPackagePayment[]
) {
  let contractPaidRub = 0;
  const byAddendum = new Map<number, number>();

  for (const row of paymentRows) {
    const amt = Number(row.amount);
    if (!Number.isFinite(amt)) continue;

    if (row.paymentType === 'AMENDMENT' && row.addendumNumber != null) {
      byAddendum.set(row.addendumNumber, (byAddendum.get(row.addendumNumber) ?? 0) + amt);
    } else if (row.paymentType !== 'AMENDMENT') {
      contractPaidRub += amt;
    }
  }

  return { contractPaidRub, byAddendum };
}

export function sumPackageIssueInvoiceJournalPaidRub(
  paymentRows: ContractDocumentPackagePayment[]
): number {
  return paymentRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}
