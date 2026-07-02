import { describe, expect, it } from 'vitest';

import { getQuizResultAdditionalExplanation } from './knowledgeQuizResultDisplay';

describe('getQuizResultAdditionalExplanation', () => {
  it('returns null for empty explanation', () => {
    expect(getQuizResultAdditionalExplanation(null, ['answer'])).toBeNull();
    expect(getQuizResultAdditionalExplanation('  ', ['answer'])).toBeNull();
  });

  it('returns null when explanation duplicates selected answer', () => {
    const answer = 'Проблемы вызывают эмоциональный отклик, а эмоции двигают решение о покупке.';
    expect(getQuizResultAdditionalExplanation(answer, [answer])).toBeNull();
  });

  it('returns explanation when it adds commentary', () => {
    const explanation = 'Рекомендация с конкретной выгодой для клиента — основа грамотного upsell.';
    expect(getQuizResultAdditionalExplanation(explanation, ['Другой текст ответа'])).toBe(
      explanation
    );
  });

  it('ignores case and extra whitespace when comparing', () => {
    expect(getQuizResultAdditionalExplanation('  Hello   World ', ['hello world'])).toBeNull();
  });
});
