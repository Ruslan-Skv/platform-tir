'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const InstallerSettlementsPage = dynamic(
  () =>
    import('@/views/admin/CRM/InstallerSettlements/InstallerSettlementsPage').then(
      (m) => m.InstallerSettlementsPage
    ),
  { ssr: false, loading: () => <PageSuspenseFallback compact message="Загрузка..." /> }
);

export default function AdminInstallerSettlementsPage() {
  return <InstallerSettlementsPage />;
}
