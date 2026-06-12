'use client';

import { TemplatesLibraryPageView } from './TemplatesLibraryPageView';
import { useTemplatesLibraryPage } from './hooks/useTemplatesLibraryPage';

export function TemplatesLibraryPage() {
  const page = useTemplatesLibraryPage();
  return <TemplatesLibraryPageView {...page} />;
}
