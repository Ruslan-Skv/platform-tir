import type { KnowledgeMaterialType } from '@/shared/api/admin-knowledge';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'e',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'y',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'ts',
        ч: 'ch',
        ш: 'sh',
        щ: 'sch',
        ъ: '',
        ы: 'y',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',
      };
      return map[c] || c;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function isKnowledgeEditor(role: string | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'CONTENT_MANAGER';
}

export function getMaterialTypeLabel(type: KnowledgeMaterialType): string {
  switch (type) {
    case 'VIDEO':
      return 'Видео';
    case 'ARTICLE':
      return 'Статья';
    case 'LINK':
      return 'Ссылка';
    default:
      return type;
  }
}

export function getMaterialTypeIcon(type: KnowledgeMaterialType): string {
  switch (type) {
    case 'VIDEO':
      return '🎬';
    case 'ARTICLE':
      return '📄';
    case 'LINK':
      return '🔗';
    default:
      return '📚';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Черновик';
    case 'PUBLISHED':
      return 'Опубликован';
    case 'ARCHIVED':
      return 'Архив';
    default:
      return status;
  }
}

export function formatAuthorName(author: {
  firstName: string | null;
  lastName: string | null;
}): string {
  const parts = [author.firstName, author.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '—';
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const READING_WORDS_PER_MINUTE = 200;

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function computeReadingTimeMinutes(content: string | null | undefined): number | null {
  if (!content?.trim()) return null;
  const words = countWords(stripHtml(content));
  if (words === 0) return null;
  return Math.max(1, Math.round(words / READING_WORDS_PER_MINUTE));
}

export function getMaterialReadingTime(material: {
  readingTimeMinutes?: number | null;
  content?: string | null;
}): number | null {
  if (material.readingTimeMinutes != null && material.readingTimeMinutes > 0) {
    return material.readingTimeMinutes;
  }
  return computeReadingTimeMinutes(material.content);
}

export function formatReadingTime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const n = Math.round(minutes);
  const mod10 = n % 10;
  const mod100 = n % 100;
  let suffix = 'минут';
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) suffix = 'минута';
    else if (mod10 >= 2 && mod10 <= 4) suffix = 'минуты';
  }
  return `${n} ${suffix} чтения`;
}

export function formatTargetAudiences(
  audiences: { label: string }[] | null | undefined
): string | null {
  if (!audiences?.length) return null;
  return audiences.map((a) => a.label).join(', ');
}

export function hasTargetAudiences(audiences: { label: string }[] | null | undefined): boolean {
  return Boolean(audiences?.length);
}
