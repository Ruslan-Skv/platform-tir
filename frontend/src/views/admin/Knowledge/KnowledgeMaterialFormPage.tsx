'use client';

import { KnowledgeMaterialFormPageView } from './KnowledgeMaterialFormPageView';
import { useKnowledgeMaterialFormPage } from './hooks/useKnowledgeMaterialFormPage';

interface KnowledgeMaterialFormPageProps {
  materialId?: string;
}

export function KnowledgeMaterialFormPage({ materialId }: KnowledgeMaterialFormPageProps) {
  const model = useKnowledgeMaterialFormPage({ materialId });
  return <KnowledgeMaterialFormPageView model={model} />;
}
