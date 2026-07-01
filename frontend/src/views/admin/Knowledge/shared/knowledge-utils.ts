import type {
  KnowledgeMaterialType,
  KnowledgeThumbnailDisplay,
} from '@/shared/api/admin-knowledge';
import { normalizeUploadsInUrl, publicUploadUrl } from '@/shared/lib/public-upload-url';
import { sanitizeHtml } from '@/shared/lib/sanitize';

export function resolveKnowledgeArticleHtml(html: string): string {
  const withUrls = html.replace(
    /(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi,
    (_match, prefix: string, src: string, suffix: string) =>
      `${prefix}${publicUploadUrl(normalizeUploadsInUrl(src))}${suffix}`
  );
  return sanitizeHtml(withUrls);
}

function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}

/** Подготавливает сохранённый plain text или HTML для TipTap-редактора. */
export function toKnowledgeRichTextEditorHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (looksLikeHtml(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** Рендер rich text на странице материала (plain text из старых записей тоже поддерживается). */
export function renderKnowledgeRichTextHtml(value: string): string {
  const asHtml = toKnowledgeRichTextEditorHtml(value);
  if (!asHtml) return '';
  return resolveKnowledgeArticleHtml(asHtml);
}

export function isKnowledgeRichTextEmpty(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  return !value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

export {
  KNOWLEDGE_RESOURCE_ID,
  KNOWLEDGE_TESTS_RESOURCE_ID,
  KNOWLEDGE_CATEGORY_RESOURCE_PREFIX,
  buildKnowledgeCategoryResourceId,
  parseKnowledgeCategoryResourceId,
  getKnowledgeCategoryResourceLabel,
} from '@/shared/config/admin-knowledge-resources';

export function isKnowledgeEditor(role: string | undefined): boolean {
  /** @deprecated Используйте useAdminResourcePermission(KNOWLEDGE_RESOURCE_ID).canEdit */
  return role === 'SUPER_ADMIN';
}

export function canViewKnowledgeTrainingAnalytics(
  role: string | undefined,
  hasKnowledgeAccess = true
): boolean {
  return hasKnowledgeAccess;
}

export function canViewCompanyKnowledgeTrainingAnalytics(
  role: string | undefined,
  hasKnowledgeAccess = true
): boolean {
  return hasKnowledgeAccess && role !== 'TRAINEE';
}

export function isKnowledgeTraineeRole(role: string | undefined): boolean {
  return role === 'TRAINEE';
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

/** Порядок статусов в списке редактора: опубликованные → черновики → архив. */
export function knowledgeMaterialListStatusRank(status: string): number {
  switch (status) {
    case 'PUBLISHED':
      return 0;
    case 'DRAFT':
      return 1;
    case 'ARCHIVED':
      return 2;
    default:
      return 3;
  }
}

export function compareKnowledgeMaterialsForCategoryList(
  a: {
    status: string;
    isPinned?: boolean;
    sortOrder?: number;
    createdAt?: string;
    module?: { order: number } | null;
  },
  b: {
    status: string;
    isPinned?: boolean;
    sortOrder?: number;
    createdAt?: string;
    module?: { order: number } | null;
  }
): number {
  const statusDiff =
    knowledgeMaterialListStatusRank(a.status) - knowledgeMaterialListStatusRank(b.status);
  if (statusDiff !== 0) return statusDiff;

  if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
    return a.isPinned ? -1 : 1;
  }

  const moduleOrderA = a.module?.order ?? Number.MAX_SAFE_INTEGER;
  const moduleOrderB = b.module?.order ?? Number.MAX_SAFE_INTEGER;
  if (moduleOrderA !== moduleOrderB) {
    return moduleOrderA - moduleOrderB;
  }

  const sortOrderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (sortOrderDiff !== 0) return sortOrderDiff;

  if (a.createdAt && b.createdAt) {
    return a.createdAt.localeCompare(b.createdAt);
  }

  return 0;
}

export function compareKnowledgeMaterialsForAllList(
  a: {
    isPinned?: boolean;
    publishedAt?: string | null;
    createdAt?: string;
  },
  b: {
    isPinned?: boolean;
    publishedAt?: string | null;
    createdAt?: string;
  }
): number {
  if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
    return a.isPinned ? -1 : 1;
  }

  const dateA = a.publishedAt ?? a.createdAt ?? '';
  const dateB = b.publishedAt ?? b.createdAt ?? '';
  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }

  return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
}

/** @deprecated use compareKnowledgeMaterialsForCategoryList */
export function compareKnowledgeMaterialsForAdminList(
  a: { status: string; isPinned?: boolean; sortOrder?: number; createdAt?: string },
  b: { status: string; isPinned?: boolean; sortOrder?: number; createdAt?: string }
): number {
  return compareKnowledgeMaterialsForCategoryList(a, b);
}

/** Порядок внутри категории/модуля: темы 1…N, черновики в конце. */
export function sortKnowledgeMaterialsForCategory<
  T extends {
    status: string;
    isPinned?: boolean;
    sortOrder?: number;
    createdAt?: string;
    module?: { order: number } | null;
  },
>(items: T[]): T[] {
  if (items.length < 2) return items;
  return [...items].sort(compareKnowledgeMaterialsForCategoryList);
}

/** Общий список «Все материалы»: сначала новые. */
export function sortKnowledgeMaterialsNewestFirst<
  T extends { isPinned?: boolean; publishedAt?: string | null; createdAt?: string },
>(items: T[]): T[] {
  if (items.length < 2) return items;
  return [...items].sort(compareKnowledgeMaterialsForAllList);
}

/** Опубликованные материалы в начале, черновики и прочие статусы — в конце. */
export function sortKnowledgeMaterialsDraftsLast<
  T extends {
    status: string;
    isPinned?: boolean;
    sortOrder?: number;
    createdAt?: string;
    module?: { order: number } | null;
  },
>(items: T[]): T[] {
  return sortKnowledgeMaterialsForCategory(items);
}

/** Группы модулей без опубликованных материалов — в конце списка. */
export function sortKnowledgeMaterialGroupsDraftsLast<
  G extends { items: Array<{ status: string }> },
>(groups: G[]): G[] {
  if (groups.length < 2) return groups;

  const hasPublished = groups.some((g) => g.items.some((m) => m.status === 'PUBLISHED'));
  const hasNonPublished = groups.some((g) => g.items.some((m) => m.status !== 'PUBLISHED'));
  if (!hasPublished || !hasNonPublished) return groups;

  const withPublished: G[] = [];
  const withoutPublished: G[] = [];
  for (const group of groups) {
    if (group.items.some((m) => m.status === 'PUBLISHED')) {
      withPublished.push(group);
    } else {
      withoutPublished.push(group);
    }
  }
  return [...withPublished, ...withoutPublished];
}

export function getKnowledgeTopicDisplayNumber(
  material: { sortOrder?: number },
  indexInGroup: number
): number {
  if (material.sortOrder != null && material.sortOrder > 0) {
    return material.sortOrder;
  }
  return indexInGroup + 1;
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

export function formatKnowledgeLikerLabel(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name || user.email;
}

export function getKnowledgeLikerDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
}): string | null {
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name || null;
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

export function getMaterialVideoDuration(material: {
  type?: string;
  readingTimeMinutes?: number | null;
}): number | null {
  if (material.type !== 'VIDEO') return null;
  if (material.readingTimeMinutes != null && material.readingTimeMinutes > 0) {
    return material.readingTimeMinutes;
  }
  return null;
}

function formatMinutesRu(minutes: number, activity: 'чтения' | 'просмотра'): string {
  const n = Math.round(minutes);
  const mod10 = n % 10;
  const mod100 = n % 100;
  let suffix = 'минут';
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) suffix = 'минута';
    else if (mod10 >= 2 && mod10 <= 4) suffix = 'минуты';
  }
  return `${n} ${suffix} ${activity}`;
}

export function formatReadingTime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  return formatMinutesRu(minutes, 'чтения');
}

export function formatVideoDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  return formatMinutesRu(minutes, 'просмотра');
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

export const KNOWLEDGE_THUMBNAIL_DISPLAY_OPTIONS: Array<{
  value: KnowledgeThumbnailDisplay;
  label: string;
  hint: string;
}> = [
  {
    value: 'COVER',
    label: 'Обрезка по высоте',
    hint: 'Заполняет ширину конспекта, лишнее по высоте обрезается (как сейчас по умолчанию).',
  },
  {
    value: 'CONTAIN',
    label: 'Вписать целиком',
    hint: 'Вся картинка видна в рамке, без обрезки; возможны поля сверху и снизу.',
  },
  {
    value: 'NATURAL',
    label: 'По пропорциям без обрезки',
    hint: 'На всю ширину, высота по изображению — удобно для вертикальных и инфографик.',
  },
];

export function getKnowledgeThumbnailDisplayClass(
  display: KnowledgeThumbnailDisplay | null | undefined,
  styles: { readonly [key: string]: string }
): string {
  switch (display) {
    case 'CONTAIN':
      return styles.thumbnailContain;
    case 'NATURAL':
      return styles.thumbnailNatural;
    case 'COVER':
    default:
      return styles.thumbnailCover;
  }
}
