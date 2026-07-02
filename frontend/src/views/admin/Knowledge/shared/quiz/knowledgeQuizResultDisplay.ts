function normalizeComparableText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Пояснение показываем только если оно не дублирует текст ответа. */
export function getQuizResultAdditionalExplanation(
  explanation: string | null | undefined,
  compareTexts: Array<string | null | undefined>
): string | null {
  const trimmed = explanation?.trim();
  if (!trimmed) return null;

  const normalized = normalizeComparableText(trimmed);
  for (const text of compareTexts) {
    if (text && normalizeComparableText(text) === normalized) {
      return null;
    }
  }

  return trimmed;
}
