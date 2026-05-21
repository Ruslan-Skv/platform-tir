/** Нормализация адреса для автопредложения объединения договоров. */
export function normalizeContractDocumentObjectAddress(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/[.,;]+$/g, '')
    .trim();
}

export function isMeaningfulContractDocumentObjectAddress(raw: string): boolean {
  return normalizeContractDocumentObjectAddress(raw).length >= 5;
}
