'use client';

import { NumberingSettingsPageView } from './NumberingSettingsPageView';
import { useNumberingSettingsPage } from './hooks/useNumberingSettingsPage';

export function ContractDocumentsNumberingSettingsPage() {
  const model = useNumberingSettingsPage();
  return <NumberingSettingsPageView {...model} />;
}
