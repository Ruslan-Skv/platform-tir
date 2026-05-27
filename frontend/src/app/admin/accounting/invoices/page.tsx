'use client';

import dynamic from 'next/dynamic';

const AccountingInvoicesPage = dynamic(
  () =>
    import('@/views/admin/Accounting/AccountingInvoicesPage').then((m) => m.AccountingInvoicesPage),
  { ssr: false, loading: () => <div style={{ padding: 24 }}>Загрузка…</div> }
);

export default function AdminAccountingInvoicesPage() {
  return <AccountingInvoicesPage />;
}
