import { describe, expect, it } from 'vitest';

import {
  buildDoorsDeliveryNoteProductsHtml,
  buildDoorsSpecificationSheetHtml,
  computeDoorsSpecificationNetTotal,
  ensureDoorsDeliveryNoteProductsHtml,
  formatDoorsSpecificationLineTotal,
  newDoorsSpecificationLine,
  normalizeDoorsSpecificationLines,
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

  it('builds blinds specification columns', () => {
    const html = buildDoorsSpecificationSheetHtml({
      packageKind: 'BLINDS',
      contractNumberLabel: '1',
      contractDateLabel: '01.01.2026',
      directorName: 'Иванов',
      customerFullName: 'Петров',
      lines: [
        {
          ...newDoorsSpecificationLine(),
          name: 'Horizontal-25',
          width: '1200',
          height: '1500',
          color: 'Белый',
          openingSide: 'Алюминий',
          mounting: 'К потолку',
          control: 'Шнур',
          quantity: '1',
          unitPrice: '3000',
        },
      ],
    });
    expect(html).toContain('Модель');
    expect(html).toContain('Ширина (мм)');
    expect(html).toContain('Высота (мм)');
    expect(html).toContain('Материал');
    expect(html).toContain('Крепление');
    expect(html).toContain('Управление');
    expect(html).toContain('Horizontal-25');
    expect(html).toContain('1200');
    expect(html).toContain('1500');
    expect(html).toContain('К потолку');
    expect(html).not.toContain('Наименование');
    expect(html).not.toContain('Сторона открывания');
    expect(html).not.toContain('Размер');
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

  it('shows zero total when position is filled without price', () => {
    const html = buildDoorsSpecificationSheetHtml({
      contractNumberLabel: '1',
      contractDateLabel: '01.01.2026',
      directorName: 'Иванов',
      customerFullName: 'Петров',
      packageKind: 'BLINDS',
      lines: [
        {
          ...newDoorsSpecificationLine(),
          name: 'Horizontal-25',
          width: '1200',
          height: '1500',
          quantity: '1',
          unitPrice: '',
        },
      ],
    });
    expect(html).toContain('Horizontal-25');
    expect(html).toContain('Итого по спецификации');
    expect(html).not.toContain('Позиции не заполнены');
  });

  it('builds delivery note products table from specification lines', () => {
    const html = buildDoorsDeliveryNoteProductsHtml([
      {
        ...newDoorsSpecificationLine(),
        name: 'Межкомнатная дверь',
        size: '800×2000',
        color: 'Дуб',
        openingSide: 'Правая',
        quantity: '2',
        unitPrice: '12000',
      },
    ]);
    expect(html).toContain('doorsDeliveryNoteProducts');
    expect(html).toContain('Межкомнатная дверь');
    expect(html).toContain('800×2000');
    expect(html).toContain('Дуб');
    expect(html).toContain('Правая');
    expect(html).toContain('>2<');
    expect(html).not.toContain('Стоимость');
    expect(html).not.toContain('Сумма');
    expect(html).not.toContain('12\u00a0000');
  });

  it('builds blinds delivery note with mounting and control columns', () => {
    const html = buildDoorsDeliveryNoteProductsHtml(
      [
        {
          ...newDoorsSpecificationLine(),
          name: 'Roll-40',
          width: '1000',
          height: '1200',
          color: 'Серый',
          openingSide: 'Ткань',
          mounting: 'К стене',
          control: 'Цепочка',
          quantity: '1',
          unitPrice: '1',
        },
      ],
      'BLINDS'
    );
    expect(html).toContain('Модель');
    expect(html).toContain('Ширина (мм)');
    expect(html).toContain('Высота (мм)');
    expect(html).toContain('Крепление');
    expect(html).toContain('Управление');
    expect(html).toContain('К стене');
    expect(html).toContain('Цепочка');
  });

  it('splits legacy size into width and height on normalize', () => {
    const lines = normalizeDoorsSpecificationLines([
      {
        id: '1',
        name: 'Model',
        size: '1100×1400',
        quantity: '1',
      },
    ]);
    expect(lines[0]?.width).toBe('1100');
    expect(lines[0]?.height).toBe('1400');
  });

  it('shows empty hint when specification has no products', () => {
    const html = buildDoorsDeliveryNoteProductsHtml([newDoorsSpecificationLine()]);
    expect(html).toContain('Позиции спецификации не заполнены');
  });

  it('injects products into legacy delivery note html without placeholder', () => {
    const products = buildDoorsDeliveryNoteProductsHtml([
      {
        ...newDoorsSpecificationLine(),
        name: 'Дверь',
        quantity: '1',
        unitPrice: '1',
      },
    ]);
    const legacy = `<div class="docPrint"><p>Текст</p><table class="signTable"><tr><td>Исполнитель</td></tr></table></div>`;
    const out = ensureDoorsDeliveryNoteProductsHtml(legacy, products);
    expect(out.indexOf('doorsDeliveryNoteProducts')).toBeGreaterThan(-1);
    expect(out.indexOf('doorsDeliveryNoteProducts')).toBeLessThan(out.indexOf('signTable'));
    expect(ensureDoorsDeliveryNoteProductsHtml(out, products)).toBe(out);
  });
});
