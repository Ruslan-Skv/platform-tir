import { describe, expect, it } from '@jest/globals';

import { parseKnowledgeQuizImportText } from './parseKnowledgeQuizImport';

const SAMPLE = `Что такое эмоциональный интеллект в продажах?
a) Умение манипулировать клиентом для получения выгоды
b) Способность распознавать свои и чужие эмоции и управлять ими
c) Хорошая память на технические характеристики окон
d) Высокая скорость обработки заявок в CRM
Правильный ответ: b

Клиент говорит: «Я боюсь, что после установки будет дуть из-под рамы». Ваш ответ:
a) «Это ерунда, наши мастера всё сделают идеально»
b) «Я понимаю ваше беспокойство. Давайте я расскажу, как мы контролируем монтаж»
c) «Тогда выберите другой профиль, он плотнее»
d) «Если будет дуть, мы переделаем, но это редко бывает»
Правильный ответ: b (здесь есть присоединение и эмпатия)`;

describe('parseKnowledgeQuizImportText', () => {
  it('parses multiline questions with correct answers', () => {
    const { questions } = parseKnowledgeQuizImportText(SAMPLE);

    expect(questions).toHaveLength(2);
    expect(questions[0].text).toContain('эмоциональный интеллект');
    expect(questions[0].options).toHaveLength(4);
    expect(questions[0].options.find((o) => o.isCorrect)?.text).toContain('распознавать');
    expect(questions[1].explanation).toContain('присоединение');
  });

  it('parses single-line docx paragraphs', () => {
    const singleLine = `Что такое EQ?a) Неверноb) Верноc) Тоже неверноd) И это неверноПравильный ответ: b`;
    const { questions } = parseKnowledgeQuizImportText(singleLine);

    expect(questions).toHaveLength(1);
    expect(questions[0].options[1].isCorrect).toBe(true);
  });

  it('throws when format is invalid', () => {
    expect(() => parseKnowledgeQuizImportText('просто текст без вопросов')).toThrow();
  });
});
