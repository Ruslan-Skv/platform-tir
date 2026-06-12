'use client';

import { AccountingInvoicesPageView } from './AccountingInvoicesPageView';
import { useAccountingInvoicesPage } from './hooks/useAccountingInvoicesPage';

export function AccountingInvoicesPage() {
  const model = useAccountingInvoicesPage();
  return <AccountingInvoicesPageView model={model} />;
}
