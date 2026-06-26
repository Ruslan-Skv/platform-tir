'use client';

export interface QuizAdminConfig {
  slug: string;
  pageTitle: string;
  domainPlaceholder: string;
  /** Ключ первого шага choice — для фильтра заявок и подсказки ?type= */
  primaryStepKey: string;
  primaryFilterLabel: string;
  prefillHint: string;
  /** Разрешить добавлять/удалять варианты на шагах с выбором */
  editableOptionsStepKeys?: string[];
}

export const MEBEL_QUIZ_ADMIN_CONFIG: QuizAdminConfig = {
  slug: 'mebel',
  pageTitle: 'Квиз — Мебель на заказ',
  domainPlaceholder: 'mebel-na-zakaz-51.ru',
  primaryStepKey: 'furniture_type',
  primaryFilterLabel: 'Все типы мебели',
  prefillHint: 'Для рекламы на кухни: ?type=kitchen — пропускает шаг выбора типа мебели.',
};

export const REMONT_QUIZ_ADMIN_CONFIG: QuizAdminConfig = {
  slug: 'remont',
  pageTitle: 'Квиз — Ремонт и отделка',
  domainPlaceholder: 'remont-kvartir-51.ru',
  primaryStepKey: 'service_direction',
  primaryFilterLabel: 'Все направления',
  prefillHint:
    'Для рекламы по направлению: ?type=repair|windows|doors|ceilings|blinds|furniture — пропускает шаг выбора направления.',
  editableOptionsStepKeys: ['service_direction'],
};

export function slugifyQuizOptionValue(label: string): string {
  const transliterated = label
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
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
      return map[char] ?? char;
    })
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return transliterated.slice(0, 40) || `opt_${Date.now()}`;
}
