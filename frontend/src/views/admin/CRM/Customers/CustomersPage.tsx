'use client';

import { CustomersPageView } from './CustomersPageView';
import { useCustomersPage } from './hooks/useCustomersPage';

export function CustomersPage() {
  const model = useCustomersPage();
  return <CustomersPageView model={model} />;
}
