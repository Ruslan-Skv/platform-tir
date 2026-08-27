export type KanbanPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const PRIORITY_LABELS: Record<KanbanPriority, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
};

export function formatKanbanUser(
  user:
    | {
        firstName: string | null;
        lastName: string | null;
        email: string;
      }
    | null
    | undefined
): string {
  if (!user) return '';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email;
}

export function userInitials(
  user:
    | {
        firstName: string | null;
        lastName: string | null;
        email: string;
      }
    | null
    | undefined
): string {
  if (!user) return '?';
  const a = user.firstName?.[0] ?? '';
  const b = user.lastName?.[0] ?? '';
  const initials = `${a}${b}`.toUpperCase();
  if (initials) return initials;
  return user.email.slice(0, 2).toUpperCase();
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function formatDueDate(dueDate: string | null | undefined): string {
  if (!dueDate) return '';
  return new Date(dueDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export function checklistProgress(
  checklist: Array<{ done: boolean }> | null | undefined
): { done: number; total: number } | null {
  if (!checklist || checklist.length === 0) return null;
  return {
    done: checklist.filter((i) => i.done).length,
    total: checklist.length,
  };
}

export function newChecklistId(): string {
  return `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
