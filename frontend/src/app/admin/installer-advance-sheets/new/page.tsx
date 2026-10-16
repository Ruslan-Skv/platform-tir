'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const InstallerAdvanceSheetCreatePage = dynamic(
  () =>
    import('@/views/admin/CRM/InstallerAdvanceSheets').then(
      (m) => m.InstallerAdvanceSheetCreatePage
    ),
  { ssr: false, loading: () => <PageSuspenseFallback compact message="Загрузка..." /> }
);

export default function AdminInstallerAdvanceSheetCreatePage() {
  return <InstallerAdvanceSheetCreatePage />;
}
