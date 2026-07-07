import { describe, expect, it } from 'vitest';

import {
  buildDoorsSpecificationSheetHtml,
  computeDoorsSpecificationNetTotal,
  formatDoorsSpecificationLineTotal,
  newDoorsSpecificationLine,
  resolveDoorsSpecificationLineTotal,
  sumDoorsSpecificationLinesTotal,
} from './doorsSpecification';

describe('doorsSpecification', () => {
  it('computes line total as quantity × unit price', () => {
    const line = {
      ...newDoorsSpecificationLine(),
      quantity: '2',
      unitPrice: '15 000,50',
    };
    expect(resolveDoorsSpecificationLineTotal(line)).toBe(30_001);
    expect(formatDoorsSpecificationLineTotal(line)).toBe('30\u00a0001,00');
  });

  it('sums only lines with content', () => {
    const empty = newDoorsSpecificationLine();
    const door = {
      ...newDoorsSpecificationLine(),
      name: 'Межкомнатная дверь',
      quantity: '1',
      unitPrice: '10 000',
    };
    expect(sumDoorsSpecificationLinesTotal([empty, door])).toBe(10_000);
  });

  it('builds printable table with required columns', () => {
    const html = buildDoorsSpecificationSheetHtml({
      contractNumberLabel: '12',
      contractDateLabel: '01.01.2026',
      directorName: 'Иванов И.И.',
      customerFullName: 'Петров П.П.',
      lines: [
        {
          ...newDoorsSpecificationLine(),
          name: 'Дверь',
          size: '800×2000',
          color: 'Белый',
          openingSide: 'Левая',
          quantity: '1',
          unitPrice: '5000',
          lineTotal: '5 000,00',
        },
      ],
    });
    expect(html).toContain('Спецификация');
    expect(html).not.toContain('Спецификация дверей');
    expect(html).toContain('Наименование');
    expect(html).toContain('Сторона открывания (Тип)');
    expect(html).toContain('800×2000');
    expect(html).toContain('Итого по спецификации');
    expect(html).toContain('Исполнитель');
    expect(html).not.toContain('Примечание');
  });

  it('applies specification discount to totals block', () => {
    const lines = [
      {
        ...newDoorsSpecificationLine(),
        name: 'Дверь',
        quantity: '1',
        unitPrice: '10 000',
      },
    ];
    const { netTotal } = computeDoorsSpecificationNetTotal(lines, '10');
    expect(netTotal).toBe(9_000);
    const html = buildDoorsSpecificationSheetHtml({
      contractNumberLabel: '1',
      contractDateLabel: '01.01.2026',
      directorName: 'Иванов',
      customerFullName: 'Петров',
      lines,
      discountPercent: '10',
    });
    expect(html).toContain('Итого по спецификации (без скидки)');
    expect(html).toContain('Скидка по спецификации: 10%');
    expect(html).toContain('Итого со скидкой');
  });
});
