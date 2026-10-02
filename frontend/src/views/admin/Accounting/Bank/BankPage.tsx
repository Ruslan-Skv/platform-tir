'use client';

import { BankPageView } from './BankPageView';
import { useBankPage } from './hooks/useBankPage';

export function BankPage() {
  const model = useBankPage();
  return <BankPageView model={model} />;
}
