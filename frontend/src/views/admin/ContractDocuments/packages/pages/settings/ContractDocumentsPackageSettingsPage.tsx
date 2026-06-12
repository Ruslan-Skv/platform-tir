'use client';

import { PackageSettingsPageView } from './PackageSettingsPageView';
import { usePackageSettingsPage } from './hooks/usePackageSettingsPage';

export function ContractDocumentsPackageSettingsPage() {
  const model = usePackageSettingsPage();
  return <PackageSettingsPageView {...model} />;
}
