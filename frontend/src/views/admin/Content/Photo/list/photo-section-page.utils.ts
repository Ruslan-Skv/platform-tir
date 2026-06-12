import type { AdminPhotoProject } from '@/shared/api/admin-photo';

import { PHOTO_DISPLAY_MODE_LABELS } from './photo-section-page.constants';

export function projectDisplayModesSummary(project: AdminPhotoProject): string {
  const d = project.displayMode;
  const m = project.displayModeMobile ?? d;
  if (m === d) return PHOTO_DISPLAY_MODE_LABELS[d] ?? d;
  return `ПК: ${PHOTO_DISPLAY_MODE_LABELS[d] ?? d} · Моб: ${PHOTO_DISPLAY_MODE_LABELS[m] ?? m}`;
}

export function slugifyPhotoCategory(text: string): string {
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
