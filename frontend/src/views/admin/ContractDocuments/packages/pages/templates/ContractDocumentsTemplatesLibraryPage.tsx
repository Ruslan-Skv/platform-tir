'use client';

import { TemplatesLibraryPageView } from './TemplatesLibraryPageView';
import { useTemplatesLibraryPage } from './library/hooks/useTemplatesLibraryPage';

export function ContractDocumentsTemplatesLibraryPage() {
  const page = useTemplatesLibraryPage();
  return <TemplatesLibraryPageView {...page} />;
}
