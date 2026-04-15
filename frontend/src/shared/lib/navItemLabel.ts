/**
 * Подпись пункта в меню: в БД/API может остаться «Фото», в интерфейсе — «Наши работы».
 */
export function navItemLabel(name: string): string {
  return name === 'Фото' ? 'Наши работы' : name;
}
