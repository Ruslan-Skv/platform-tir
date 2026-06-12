'use client';

import { KnowledgeMaterialViewPageView } from './KnowledgeMaterialViewPageView';
import { useKnowledgeMaterialViewPage } from './hooks/useKnowledgeMaterialViewPage';

interface KnowledgeMaterialViewPageProps {
  materialId: string;
}

export function KnowledgeMaterialViewPage({ materialId }: KnowledgeMaterialViewPageProps) {
  const model = useKnowledgeMaterialViewPage({ materialId });
  return <KnowledgeMaterialViewPageView model={model} />;
}
