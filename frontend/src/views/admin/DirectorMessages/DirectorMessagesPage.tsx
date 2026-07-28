'use client';

import { LeadsInboxPageView } from '@/views/admin/Leads/LeadsInboxPageView';

import { useDirectorMessagesPage } from './hooks/useDirectorMessagesPage';

export function DirectorMessagesPage() {
  const model = useDirectorMessagesPage();
  return <LeadsInboxPageView model={{ ...model, setPage: (page) => model.setPage(page) }} />;
}
