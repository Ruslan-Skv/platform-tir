import type { SitePlatformFeedbackType } from '@/shared/api/admin-site-feedback';

export const FEEDBACK_TYPE_LABELS: Record<SitePlatformFeedbackType, string> = {
  SUGGESTION: 'Предложение',
  BUG: 'Ошибка',
};

export function formatFeedbackAuthor(item: {
  author: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  senderName: string | null;
  senderEmail: string | null;
}): string {
  if (item.author) {
    const name = `${item.author.firstName ?? ''} ${item.author.lastName ?? ''}`.trim();
    return name || item.author.email;
  }
  if (item.senderName?.trim()) {
    return item.senderEmail?.trim()
      ? `${item.senderName.trim()} (${item.senderEmail.trim()})`
      : item.senderName.trim();
  }
  return 'Посетитель сайта';
}

export function formatFeedbackDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
