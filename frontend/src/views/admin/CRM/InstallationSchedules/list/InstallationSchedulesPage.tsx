'use client';

import { InstallationSchedulesPageView } from './InstallationSchedulesPageView';
import { useInstallationSchedulesPage } from './hooks/useInstallationSchedulesPage';

export function InstallationSchedulesPage() {
  return <InstallationSchedulesPageView model={useInstallationSchedulesPage()} />;
}
