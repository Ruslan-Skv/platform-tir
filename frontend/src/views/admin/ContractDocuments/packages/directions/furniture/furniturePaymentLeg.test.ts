import {
  encodeFurniturePaymentLegNotes,
  furniturePaymentBasisLabel,
  parseFurniturePaymentLegFromNotes,
  resolveFurniturePaymentLeg,
  sumFurnitureLegPaidRub,
} from './furniturePaymentLeg';

describe('furniturePaymentLeg', () => {
  it('encodes and parses notes marker', () => {
    expect(parseFurniturePaymentLegFromNotes(encodeFurniturePaymentLegNotes('montage'))).toBe(
      'montage'
    );
    expect(
      parseFurniturePaymentLegFromNotes(encodeFurniturePaymentLegNotes('appliances', 'коммент'))
    ).toBe('appliances');
  });

  it('resolves leg from basis label', () => {
    expect(
      resolveFurniturePaymentLeg({
        notes: null,
        basis: furniturePaymentBasisLabel('manufacture', 'prepayment'),
      })
    ).toBe('manufacture');
    expect(
      resolveFurniturePaymentLeg({
        notes: null,
        basis: furniturePaymentBasisLabel('appliances', 'prepayment'),
      })
    ).toBe('appliances');
  });

  it('sums paid by leg', () => {
    const rows = [
      {
        amount: '1000',
        notes: encodeFurniturePaymentLegNotes('manufacture'),
        basis: furniturePaymentBasisLabel('manufacture', 'prepayment'),
        paymentType: 'PREPAYMENT',
      },
      {
        amount: '500',
        notes: encodeFurniturePaymentLegNotes('montage'),
        basis: furniturePaymentBasisLabel('montage', 'partial'),
        paymentType: 'ADVANCE',
      },
    ] as never;
    expect(sumFurnitureLegPaidRub(rows, 'manufacture')).toBe(1000);
    expect(sumFurnitureLegPaidRub(rows, 'montage')).toBe(500);
    expect(sumFurnitureLegPaidRub(rows, 'appliances')).toBe(0);
  });
});
