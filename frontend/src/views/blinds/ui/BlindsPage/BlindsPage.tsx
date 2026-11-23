'use client';

import type { BlindsSectionData } from '@/shared/api/blinds';

import { BlindsPageView } from './BlindsPageView';
import { useBlindsPage } from './hooks/useBlindsPage';

export function BlindsPage({ initialData }: { initialData: BlindsSectionData | null }) {
  const model = useBlindsPage(initialData);
  return <BlindsPageView model={model} />;
}
