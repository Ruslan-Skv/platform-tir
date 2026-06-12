import type { TaskFormState } from './tasks-page.types';

export const TYPE_LABELS: Record<string, string> = {
  TODO: 'Задача',
  CALL: 'Звонок',
  EMAIL: 'Email',
  MEETING: 'Встреча',
  FOLLOW_UP: 'Продолжение',
  REMINDER: 'Напоминание',
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнена',
  CANCELLED: 'Отменена',
};

export const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
export const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));
export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const EMPTY_TASK_FORM: TaskFormState = {
  title: '',
  description: '',
  type: 'TODO',
  priority: 'MEDIUM',
  dueDate: '',
  assigneeId: '',
};

export const TASKS_PAGE_LIMIT = 20;
