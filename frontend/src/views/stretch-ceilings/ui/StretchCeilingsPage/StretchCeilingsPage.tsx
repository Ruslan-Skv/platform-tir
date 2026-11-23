'use client';

import type { StretchCeilingsSectionData } from '@/shared/api/stretch-ceilings';

import { StretchCeilingsPageView } from './StretchCeilingsPageView';
import { useStretchCeilingsPage } from './hooks/useStretchCeilingsPage';

export function StretchCeilingsPage({
  initialData,
}: {
  initialData: StretchCeilingsSectionData | null;
}) {
  const model = useStretchCeilingsPage(initialData);
  return <StretchCeilingsPageView model={model} />;
}
