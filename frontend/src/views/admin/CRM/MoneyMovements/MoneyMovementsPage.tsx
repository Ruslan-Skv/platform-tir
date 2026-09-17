'use client';

import { MoneyMovementsPageView } from './MoneyMovementsPageView';
import { useMoneyMovementsPage } from './hooks/useMoneyMovementsPage';

export function MoneyMovementsPage() {
  const model = useMoneyMovementsPage();
  return <MoneyMovementsPageView model={model} />;
}
