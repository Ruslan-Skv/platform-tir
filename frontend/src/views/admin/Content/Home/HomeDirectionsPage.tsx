'use client';

import { HomeDirectionsPageView } from './HomeDirectionsPageView';
import { useHomeDirectionsPage } from './hooks/useHomeDirectionsPage';

export function HomeDirectionsPage() {
  const model = useHomeDirectionsPage();
  return <HomeDirectionsPageView model={model} />;
}
