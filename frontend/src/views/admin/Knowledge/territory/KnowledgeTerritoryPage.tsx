'use client';

import { KnowledgeTerritoryPageView } from './KnowledgeTerritoryPageView';
import { useKnowledgeTerritoryPage } from './hooks/useKnowledgeTerritoryPage';

export function KnowledgeTerritoryPage() {
  const model = useKnowledgeTerritoryPage();
  return <KnowledgeTerritoryPageView model={model} />;
}
