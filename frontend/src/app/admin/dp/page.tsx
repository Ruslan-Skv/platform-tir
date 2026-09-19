'use client';

import dynamic from 'next/dynamic';

import { PageSuspenseFallback } from '@/shared/ui/PageSuspenseFallback';

const MoneyMovementsPage = dynamic(
  () =>
    import('@/views/admin/CRM/MoneyMovements/MoneyMovementsPage').then((m) => m.MoneyMovementsPage),
  { ssr: false, loading: () => <PageSuspenseFallback compact message="Загрузка..." /> }
);

export default function AdminMoneyMovementsPage() {
  return <MoneyMovementsPage />;
}
