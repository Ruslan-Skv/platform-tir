'use client';

import { useInstallerAdvanceSheetDetailPage } from '../hooks/useInstallerAdvanceSheetDetailPage';
import { InstallerAdvanceSheetDetailPageView } from './InstallerAdvanceSheetDetailPageView';

export function InstallerAdvanceSheetDetailPage() {
  const model = useInstallerAdvanceSheetDetailPage();
  return <InstallerAdvanceSheetDetailPageView model={model} />;
}
