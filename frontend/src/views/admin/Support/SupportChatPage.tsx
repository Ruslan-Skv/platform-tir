'use client';

import { SupportChatPageView } from './SupportChatPageView';
import { useSupportChatPage } from './hooks/useSupportChatPage';

export function SupportChatPage() {
  const model = useSupportChatPage();
  return <SupportChatPageView model={model} />;
}
