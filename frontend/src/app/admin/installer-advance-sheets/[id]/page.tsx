'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

/** Роут карточки ведомости: список ведомостей + модалка самой ведомости. */
const InstallerAdvanceSheetDetailRoutePage = dynamic(
  () =>
    import('@/views/admin/CRM/InstallerAdvanceSheets').then(
      (m) => m.InstallerAdvanceSheetDetailRoutePage
    ),
  { ssr: false, loading: () => <PageSuspenseFallback compact message="Загрузка..." /> }
);

export default function AdminInstallerAdvanceSheetDetailPage() {
  const params = useParams<{ id: string }>();
  const sheetId = typeof params?.id === 'string' ? params.id : '';
  if (!sheetId) return null;

  return <InstallerAdvanceSheetDetailRoutePage sheetId={sheetId} />;
}
