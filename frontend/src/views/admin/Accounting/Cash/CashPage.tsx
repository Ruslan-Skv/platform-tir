'use client';

import { CashPageView } from './CashPageView';
import { useCashPage } from './hooks/useCashPage';

export function CashPage() {
  const model = useCashPage();
  return <CashPageView model={model} />;
}
