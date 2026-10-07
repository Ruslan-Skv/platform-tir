import {
  formatMoneyRublesKopecksGrouped,
  formatMoneyWholeGrouped,
  groupThousands,
} from './moneyWhole';

describe('groupThousands', () => {
  it('разряды через неразрывный пробел', () => {
    expect(groupThousands('1453377')).toBe('1\u00A0453\u00A0377');
    expect(groupThousands('999')).toBe('999');
    expect(groupThousands('1000')).toBe('1\u00A0000');
  });
});

describe('formatMoneyWholeGrouped', () => {
  it('целые рубли с разделением разрядов', () => {
    expect(formatMoneyWholeGrouped(1453377.76)).toBe('1\u00A0453\u00A0378');
    expect(formatMoneyWholeGrouped(999)).toBe('999');
  });
});

describe('formatMoneyRublesKopecksGrouped', () => {
  it('целая сумма — без копеек', () => {
    expect(formatMoneyRublesKopecksGrouped(1453377)).toBe('1\u00A0453\u00A0377');
    expect(formatMoneyRublesKopecksGrouped(1101)).toBe('1\u00A0101');
  });

  it('дробная сумма — с копейками', () => {
    expect(formatMoneyRublesKopecksGrouped(1453377.76)).toBe('1\u00A0453\u00A0377,76');
    expect(formatMoneyRublesKopecksGrouped(1100.5)).toBe('1\u00A0100,50');
  });

  it('малые суммы без разделителей', () => {
    expect(formatMoneyRublesKopecksGrouped(330)).toBe('330');
    expect(formatMoneyRublesKopecksGrouped(0)).toBe('0');
  });
});
