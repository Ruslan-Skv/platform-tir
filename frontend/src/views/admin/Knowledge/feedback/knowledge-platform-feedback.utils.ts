import type { KnowledgePlatformFeedbackType } from '@/shared/api/admin-knowledge';

export const FEEDBACK_TYPE_LABELS: Record<KnowledgePlatformFeedbackType, string> = {
  SUGGESTION: 'Предложение',
  BUG: 'Ошибка',
};

export function formatFeedbackAuthor(author: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim();
  return name ? `${name} (${author.email})` : author.email;
}

export function formatFeedbackDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
