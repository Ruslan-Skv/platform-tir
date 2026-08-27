'use client';

import { KanbanPageView } from './KanbanPageView';
import { useKanbanPage } from './hooks/useKanbanPage';

export function KanbanPage() {
  const model = useKanbanPage();
  return <KanbanPageView model={model} />;
}
