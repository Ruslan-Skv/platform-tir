'use client';

import { RemoteHelpPageView } from './RemoteHelpPageView';
import { useRemoteHelpPage } from './hooks/useRemoteHelpPage';

export function RemoteHelpPage() {
  const model = useRemoteHelpPage();
  return <RemoteHelpPageView model={model} />;
}
