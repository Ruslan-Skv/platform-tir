'use client';

import { MyInstallationSchedulesPageView } from './MyInstallationSchedulesPageView';
import { useMyInstallationSchedulesPage } from './hooks/useMyInstallationSchedulesPage';

export function MyInstallationSchedulesPage() {
  const model = useMyInstallationSchedulesPage();
  return <MyInstallationSchedulesPageView model={model} />;
}
