import { describe, expect, it } from 'vitest';

import {
  computeCeilingsSpecificationNetTotal,
  defaultCeilingsSpecification,
  flattenCeilingsSpecificationRows,
  newCeilingsFabricLine,
  newCeilingsNamedQtyLine,
} from './ceilingsSpecification';

describe('ceilingsSpecification', () => {
  it('computes totals with extra markup and discount', () => {
    const spec = defaultCeilingsSpecification(10);
    spec.ceilings[0]!.fabrics = [
      newCeilingsFabricLine({
        texture: 'Матовый',
        article: 'М01',
        qtyM2: '10',
        unitPrice: '360',
      }),
    ];
    spec.ceilings[0]!.profiles = [
      newCeilingsNamedQtyLine({
        name: 'Багет ПВХ',
        qty: '4',
        unitPrice: '243',
      }),
    ];
    spec.discountPercent = '10';
    const totals = computeCeilingsSpecificationNetTotal(spec);
    expect(totals.grossTotal).toBe(10 * 360 + 4 * 243);
    expect(totals.withExtraMarkup).toBeCloseTo(totals.grossTotal * 1.1);
    expect(totals.netTotal).toBeCloseTo(totals.withExtraMarkup * 0.9);
  });

  it('flattens rows for print', () => {
    const spec = defaultCeilingsSpecification();
    spec.ceilings[0]!.title = 'Кухня';
    spec.ceilings[0]!.fabrics = [
      newCeilingsFabricLine({
        texture: 'Сатиновый',
        article: 'S01',
        qtyM2: '12',
        unitPrice: '400',
      }),
    ];
    const rows = flattenCeilingsSpecificationRows(spec);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ceilingTitle).toBe('Кухня');
    expect(rows[0]?.amount).toBe(4800);
  });
});
