'use client';

import { MarkupSettingsPageView } from './MarkupSettingsPageView';
import { useMarkupSettingsPage } from './hooks/useMarkupSettingsPage';

export function ContractDocumentsMarkupSettingsPage() {
  const model = useMarkupSettingsPage();
  return <MarkupSettingsPageView {...model} />;
}
