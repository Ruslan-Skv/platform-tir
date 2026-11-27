/**
 * Реестр украшений публичного сайта: код → название и описание для админки.
 * Строки в таблице site_decorations создаются автоматически при первом чтении списка,
 * поэтому новое украшение достаточно добавить сюда и реализовать его на фронте.
 * Варианты — выбор вида одного украшения (например, вид гирлянды); null в БД = первый вариант.
 */
export interface SiteDecorationVariantDefinition {
  value: string;
  label: string;
}

export interface SiteDecorationDefinition {
  code: string;
  title: string;
  description: string;
  variants?: readonly SiteDecorationVariantDefinition[];
}

export const SITE_DECORATIONS: readonly SiteDecorationDefinition[] = [
  {
    code: 'new-year-snow',
    title: 'Новогоднее украшение — снег',
    description:
      'Падающий снег поверх страниц публичного сайта: вращающиеся снежинки-кристаллы, у нижнего края экрана снег накапливается сугробами (canvas, не мешает кликам). В админке не отображается.',
  },
  {
    code: 'new-year-garland',
    title: 'Новогоднее украшение — гирлянды',
    description:
      'Гирлянда вдоль нижней кромки шапки публичного сайта, под меню навигации (кликам не мешает). Едет вместе с шапкой при прокрутке. На мобильных (≤768px) не отображается.',
    variants: [
      { value: 'lights', label: 'Лампочки — сплошная нить на всю ширину меню' },
      { value: 'baubles', label: 'Шары и шишки — ветки по левому и правому краям' },
    ],
  },
];

export function findSiteDecorationDefinition(code: string): SiteDecorationDefinition | undefined {
  return SITE_DECORATIONS.find((decoration) => decoration.code === code);
}

/** Валидный вариант украшения: переданный, либо первый из реестра. */
export function resolveSiteDecorationVariant(code: string, variant: string | null): string | null {
  const definition = findSiteDecorationDefinition(code);
  if (!definition?.variants?.length) return null;
  return definition.variants.some((v) => v.value === variant)
    ? variant
    : definition.variants[0].value;
}
