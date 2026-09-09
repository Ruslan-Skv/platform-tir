import { defaultPackageFormData } from '../../../platform/form/defaults';
import { newDoorsSpecificationLine } from '../specification/doorsSpecification';
import { computeProductContractCostBreakdown } from './productContractCostBreakdown';

describe('computeProductContractCostBreakdown', () => {
  it('uses doors specification lines total for products cost when filled', () => {
    const base = defaultPackageFormData();
    const breakdown = computeProductContractCostBreakdown({
      ...base,
      estimate: { ...base.estimate, snapshot: { total: 20_000, rooms: [] } },
      doorsSpecificationLines: [
        {
          ...newDoorsSpecificationLine(),
          name: 'Дверь',
          quantity: '2',
          unitPrice: '5000',
        },
      ],
    });
    expect(breakdown.productsAmount).toBe(10_000);
    expect(breakdown.worksAmount).toBe(20_000);
    expect(breakdown.totalAmount).toBe(30_000);
  });

  it('applies doors specification discount to products cost', () => {
    const base = defaultPackageFormData();
    const breakdown = computeProductContractCostBreakdown({
      ...base,
      doorsSpecificationLines: [
        {
          ...newDoorsSpecificationLine(),
          name: 'Дверь',
          quantity: '1',
          unitPrice: '10 000',
        },
      ],
      doorsSpecificationDiscountPercent: '10',
    });
    expect(breakdown.productsAmount).toBe(9_000);
  });

  it('falls back to productSpecificationAmount when doors lines are empty', () => {
    const base = defaultPackageFormData();
    const breakdown = computeProductContractCostBreakdown({
      ...base,
      productSpecificationAmount: '40 000',
      estimate: { ...base.estimate, snapshot: { total: 60_000, rooms: [] } },
      doorsSpecificationLines: [],
    });
    expect(breakdown.productsAmount).toBe(40_000);
  });

  it('uses ceilings specification net total for products when filled', () => {
    const base = defaultPackageFormData();
    const breakdown = computeProductContractCostBreakdown({
      ...base,
      ceilingsSpecification: {
        extraMarkupPercent: '0',
        discountPercent: '',
        ceilings: [
          {
            ...base.ceilingsSpecification.ceilings[0]!,
            fabrics: [
              {
                id: 'f1',
                priceItemId: '',
                texture: 'Матовый',
                series: 'М01',
                color: '',
                article: 'М01',
                qtyM2: '10',
                unitPrice: '300',
              },
            ],
          },
        ],
      },
    });
    expect(breakdown.productsAmount).toBe(3_000);
  });
});
