'use client';

import { useInstallerAdvanceSheetsPage } from '../hooks/useInstallerAdvanceSheetsPage';
import { InstallerAdvanceSheetsPageView } from './InstallerAdvanceSheetsPageView';

export function InstallerAdvanceSheetsPage() {
  const model = useInstallerAdvanceSheetsPage();
  return <InstallerAdvanceSheetsPageView model={model} />;
}
