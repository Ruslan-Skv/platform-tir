'use client';

import { StretchCeilingsAdminPageView } from './StretchCeilingsPageView';
import { useStretchCeilingsPage } from './hooks/useStretchCeilingsPage';

export function StretchCeilingsSectionPage() {
  const model = useStretchCeilingsPage();
  return <StretchCeilingsAdminPageView model={model} />;
}
