/** Нормализует строку адреса для поиска на карте. */
export function normalizeAddressForMapSearch(address: string): string {
  return address.trim().replace(/\s+/g, ' ');
}

/** Поиск адреса на Яндекс.Картах (открывается в новой вкладке). */
export function buildAddressMapSearchUrl(address: string): string {
  const query = normalizeAddressForMapSearch(address);
  if (!query) return '';
  return `https://yandex.ru/maps/?mode=search&text=${encodeURIComponent(query)}`;
}
