'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const InstallerAdvanceSheetDetailPage = dynamic(
  () =>
    import('@/views/admin/CRM/InstallerAdvanceSheets').then(
      (m) => m.InstallerAdvanceSheetDetailPage
    ),
  { ssr: false, loading: () => <PageSuspenseFallback compact message="Загрузка..." /> }
);

export default function AdminInstallerAdvanceSheetDetailPage() {
  return <InstallerAdvanceSheetDetailPage />;
}
