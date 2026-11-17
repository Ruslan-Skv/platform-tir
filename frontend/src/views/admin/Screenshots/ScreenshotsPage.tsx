'use client';

import { ScreenshotsPageView } from './ScreenshotsPageView';
import { useScreenshotsPage } from './hooks/useScreenshotsPage';

export function ScreenshotsPage() {
  const model = useScreenshotsPage();
  return <ScreenshotsPageView model={model} />;
}
