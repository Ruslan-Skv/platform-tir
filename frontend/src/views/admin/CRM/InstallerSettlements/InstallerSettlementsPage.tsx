'use client';

import { InstallerSettlementsPageView } from './InstallerSettlementsPageView';
import { useInstallerSettlementsPage } from './hooks/useInstallerSettlementsPage';

export function InstallerSettlementsPage() {
  const model = useInstallerSettlementsPage();
  return <InstallerSettlementsPageView model={model} />;
}
