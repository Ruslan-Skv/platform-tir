'use client';

import { CashRegisterPageView } from './CashRegisterPageView';
import { useCashRegisterPage } from './hooks/useCashRegisterPage';

export type { CashRegisterRow } from './cash-register-page.types';

export function CashRegisterPage() {
  const model = useCashRegisterPage();
  return <CashRegisterPageView model={model} />;
}

export default CashRegisterPage;
