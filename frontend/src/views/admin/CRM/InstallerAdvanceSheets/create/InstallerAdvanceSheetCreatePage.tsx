'use client';

import { useInstallerAdvanceSheetCreatePage } from '../hooks/useInstallerAdvanceSheetCreatePage';
import { InstallerAdvanceSheetCreatePageView } from './InstallerAdvanceSheetCreatePageView';

export function InstallerAdvanceSheetCreatePage() {
  const model = useInstallerAdvanceSheetCreatePage();
  return <InstallerAdvanceSheetCreatePageView model={model} />;
}
