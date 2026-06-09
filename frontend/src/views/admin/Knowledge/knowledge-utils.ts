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
