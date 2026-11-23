'use client';

import { BlindsAdminPageView } from './BlindsPageView';
import { useBlindsAdminPage } from './hooks/useBlindsPage';

export function BlindsSectionPage() {
  const model = useBlindsAdminPage();
  return <BlindsAdminPageView model={model} />;
}
