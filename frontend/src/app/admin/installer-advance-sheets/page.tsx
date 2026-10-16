'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const InstallerAdvanceSheetsPage = dynamic(
  () =>
    import('@/views/admin/CRM/InstallerAdvanceSheets').then((m) => m.InstallerAdvanceSheetsPage),
  { ssr: false, loading: () => <PageSuspenseFallback compact message="Загрузка..." /> }
);

export default function AdminInstallerAdvanceSheetsPage() {
  return <InstallerAdvanceSheetsPage />;
}
