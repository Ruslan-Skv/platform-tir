'use client';

import { TasksPageView } from './TasksPageView';
import { useTasksPage } from './hooks/useTasksPage';

export function TasksPage() {
  const model = useTasksPage();
  return <TasksPageView model={model} />;
}
