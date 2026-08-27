'use client';

import { MessengerPageView } from './MessengerPageView';
import { useMessengerPage } from './hooks/useMessengerPage';

export function MessengerPage() {
  const model = useMessengerPage();
  return <MessengerPageView model={model} />;
}
