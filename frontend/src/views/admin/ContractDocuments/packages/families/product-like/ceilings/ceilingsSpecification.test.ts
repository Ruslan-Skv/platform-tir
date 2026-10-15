import {
  computeCeilingsSpecificationNetTotal,
  defaultCeilingsSpecification,
  flattenCeilingsSpecificationRows,
  newCeilingsFabricLine,
  newCeilingsManualQtyLine,
  newCeilingsNamedQtyLine,
  normalizeCeilingsSpecification,
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

  it('supports manual goods lines outside the price list', () => {
    const spec = defaultCeilingsSpecification(10);
    spec.ceilings[0]!.goods = [
      newCeilingsManualQtyLine({ name: 'Светильник GX53', qty: '5', unitPrice: '800' }),
      newCeilingsManualQtyLine({ unit: 'м', qty: '12,5', unitPrice: '240' }),
    ];
    const totals = computeCeilingsSpecificationNetTotal(spec);
    expect(totals.grossTotal).toBe(5 * 800 + 12.5 * 240);
    expect(totals.withExtraMarkup).toBeCloseTo(totals.grossTotal * 1.1);

    const rows = flattenCeilingsSpecificationRows(spec);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: 'Светильник GX53',
      qty: '5',
      unit: 'шт',
      amount: 4000,
      block: 'goods',
    });
    expect(rows[1]).toMatchObject({ name: 'Товар', qty: '12,5', unit: 'м', amount: 3000 });
  });

  it('keeps the manual flag through normalize and drops it for price list picks', () => {
    const spec = defaultCeilingsSpecification();
    spec.ceilings[0]!.goods = [newCeilingsManualQtyLine({ name: 'Блок питания', qty: '2' })];
    const restored = normalizeCeilingsSpecification(JSON.parse(JSON.stringify(spec)));
    expect(restored.ceilings[0]!.goods[0]!.manual).toBe(true);
    expect(restored.ceilings[0]!.goods[0]!.name).toBe('Блок питания');

    expect(newCeilingsNamedQtyLine().manual).toBeUndefined();
  });
});
