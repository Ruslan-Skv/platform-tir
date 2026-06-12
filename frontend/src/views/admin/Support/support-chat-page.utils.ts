import type { Conversation } from './support-chat-page.types';

export function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function userName(c: Conversation) {
  return [c.user.firstName, c.user.lastName].filter(Boolean).join(' ') || c.user.email;
}
