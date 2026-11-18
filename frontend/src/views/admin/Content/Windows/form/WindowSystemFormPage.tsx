'use client';

import { WindowSystemFormPageView } from './WindowSystemFormPageView';
import { useWindowSystemFormPage } from './hooks/useWindowSystemFormPage';

export function WindowSystemFormPage({ systemId }: { systemId?: string }) {
  const model = useWindowSystemFormPage(systemId);
  return <WindowSystemFormPageView model={model} />;
}
