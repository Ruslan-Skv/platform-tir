'use client';

import { InstallersPageView } from './InstallersPageView';
import { useInstallersPage } from './hooks/useInstallersPage';

export function InstallersPage() {
  const model = useInstallersPage();
  return <InstallersPageView model={model} />;
}
