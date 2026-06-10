'use client';

import { SignatoriesPageView } from './SignatoriesPageView';
import { useSignatoriesPage } from './hooks/useSignatoriesPage';

export function ContractDocumentsSignatoriesPage() {
  const model = useSignatoriesPage();
  return <SignatoriesPageView {...model} />;
}
