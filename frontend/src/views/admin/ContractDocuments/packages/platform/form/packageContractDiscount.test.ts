import { defaultPackageFormData } from './defaults';
import { formatMoneyWholeGrouped } from './moneyWhole';
import {
  addendumSlotDiscountHint,
  contractDiscountHint,
  deriveDiscountPercentFromAmount,
  formatDiscountPercentForField,
  formatDiscountPercentShort,
  parseDiscountAmountRub,
  resolveAddendumSlotDiscount,
  resolveContractDiscount,
  syncPackageDiscountDerivedFields,
} from './packageContractDiscount';
import type { PackageFormData } from './types';

function formWithEstimate(total: number, overrides?: Partial<PackageFormData>): PackageFormData {
  const base = defaultPackageFormData();
  return {
    ...base,
    ...overrides,
    estimate: { ...base.estimate, snapshot: { total, rooms: [] } },
  };
}

describe('parseDiscountAmountRub', () => {
  it('пробелы/запятая/мусор', () => {
    expect(parseDiscountAmountRub('10 000,50')).toBe(10000.5);
    expect(parseDiscountAmountRub('')).toBe(0);
    expect(parseDiscountAmountRub('abc')).toBe(0);
    expect(parseDiscountAmountRub('-5')).toBe(0);
  });
});

describe('deriveDiscountPercentFromAmount', () => {
  it('пропорционально базе, clamp на 100', () => {
    expect(deriveDiscountPercentFromAmount(10000, 80000)).toBe(12.5);
    expect(deriveDiscountPercentFromAmount(200000, 100000)).toBe(100);
    expect(deriveDiscountPercentFromAmount(1000, 0)).toBe(0);
    expect(deriveDiscountPercentFromAmount(0, 1000)).toBe(0);
  });
});

describe('formatDiscountPercentForField', () => {
  it('до 6 знаков, запятая, 0 → пусто', () => {
    expect(formatDiscountPercentForField(12.5)).toBe('12,5');
    expect(formatDiscountPercentForField(12.3456789)).toBe('12,345679');
    expect(formatDiscountPercentForField(0)).toBe('');
  });
});

describe('formatDiscountPercentShort', () => {
  it('до 2 знаков для подписей', () => {
    expect(formatDiscountPercentShort(12.3456789)).toBe('12,35');
    expect(formatDiscountPercentShort(5)).toBe('5');
  });
});

describe('resolveContractDiscount', () => {
  it('режим %: процент из поля', () => {
    const form = formWithEstimate(100000, {
      contract: { ...defaultPackageFormData().contract, discountPercent: '7' },
    });
    expect(resolveContractDiscount(form)).toMatchObject({
      mode: 'PERCENT',
      percent: 7,
      amountRub: null,
      baseTotal: 100000,
    });
  });

  it('режим руб.: производный % от итога сметы', () => {
    const base = defaultPackageFormData();
    const form = formWithEstimate(80000, {
      contract: {
        ...base.contract,
        discountType: 'AMOUNT',
        discountAmount: '10 000',
        discountPercent: '',
      },
    });
    expect(resolveContractDiscount(form)).toMatchObject({
      mode: 'AMOUNT',
      percent: 12.5,
      amountRub: 10000,
      baseTotal: 80000,
    });
  });

  it('режим руб. без сметы: 0%, но сумма сохраняется', () => {
    const base = defaultPackageFormData();
    const form: PackageFormData = {
      ...base,
      contract: { ...base.contract, discountType: 'AMOUNT', discountAmount: '10 000' },
    };
    expect(resolveContractDiscount(form)).toMatchObject({
      mode: 'AMOUNT',
      percent: 0,
      amountRub: 10000,
      baseTotal: null,
    });
  });
});

describe('resolveAddendumSlotDiscount', () => {
  it('INHERIT → договоровая, PERCENT/AMOUNT → своя (замещает)', () => {
    const base = defaultPackageFormData();
    const form: PackageFormData = {
      ...formWithEstimate(100000, {
        contract: { ...base.contract, discountPercent: '5' },
      }),
      addendumSlotCount: 3,
      addendumSlots: [
        { ...base.addendumSlots[0], discountType: 'INHERIT' },
        {
          ...base.addendumSlots[1],
          discountType: 'PERCENT',
          discountPercent: '20',
          snapshot: { total: 50000, rooms: [] },
        },
        {
          ...base.addendumSlots[2],
          discountType: 'AMOUNT',
          discountAmount: '10 000',
          snapshot: { total: 40000, rooms: [] },
        },
      ] as unknown as PackageFormData['addendumSlots'],
    };
    expect(resolveAddendumSlotDiscount(form, 0)).toMatchObject({
      mode: 'INHERIT',
      percent: 5,
      overridesContract: false,
    });
    expect(resolveAddendumSlotDiscount(form, 1)).toMatchObject({
      mode: 'PERCENT',
      percent: 20,
      overridesContract: true,
    });
    // 10 000 от 40 000 → 25%
    expect(resolveAddendumSlotDiscount(form, 2)).toMatchObject({
      mode: 'AMOUNT',
      percent: 25,
      amountRub: 10000,
      overridesContract: true,
    });
  });
});

describe('syncPackageDiscountDerivedFields', () => {
  it('пересчитывает производный % при смене итога сметы (скидка остаётся рублями)', () => {
    const base = defaultPackageFormData();
    let form = formWithEstimate(100000, {
      contract: { ...base.contract, discountType: 'AMOUNT', discountAmount: '10 000' },
    });
    form = syncPackageDiscountDerivedFields(form);
    expect(form.contract.discountPercent).toBe('10');
    // Смету изменили до 200 000 → процент стал 5, сумма осталась 10 000 руб.
    form = syncPackageDiscountDerivedFields(formWithEstimate(200000, { contract: form.contract }));
    expect(form.contract.discountPercent).toBe('5');
    expect(form.contract.discountAmount).toBe('10 000');
  });

  it('рублёвая скидка Д/с пересчитывается от итога работ этого Д/с', () => {
    const base = defaultPackageFormData();
    const slot = {
      ...base.addendumSlots[0],
      discountType: 'AMOUNT' as const,
      discountAmount: '5 000',
      snapshot: { total: 50000, rooms: [] },
    };
    let form: PackageFormData = {
      ...base,
      addendumSlotCount: 1,
      addendumSlots: [
        slot,
        ...base.addendumSlots.slice(1),
      ] as unknown as PackageFormData['addendumSlots'],
    };
    form = syncPackageDiscountDerivedFields(form);
    expect(form.addendumSlots[0].discountPercent).toBe('10');
    // Работы Д/с уменьшились до 20 000 → 25%
    form = syncPackageDiscountDerivedFields({
      ...form,
      addendumSlots: [
        { ...form.addendumSlots[0], snapshot: { total: 20000, rooms: [] } },
        ...form.addendumSlots.slice(1),
      ] as unknown as PackageFormData['addendumSlots'],
    });
    expect(form.addendumSlots[0].discountPercent).toBe('25');
  });

  it('режим % не меняется', () => {
    const base = defaultPackageFormData();
    const form = formWithEstimate(100000, {
      contract: { ...base.contract, discountPercent: '7' },
    });
    expect(syncPackageDiscountDerivedFields(form)).toBe(form);
  });
});

describe('подсказки', () => {
  it('contractDiscountHint только для режима руб.', () => {
    const base = defaultPackageFormData();
    expect(contractDiscountHint(formWithEstimate(100000))).toBeNull();
    const form = formWithEstimate(80000, {
      contract: { ...base.contract, discountType: 'AMOUNT', discountAmount: '10 000' },
    });
    expect(contractDiscountHint(form)).toBe(
      `≈ 12,5% → итого со скидкой ${formatMoneyWholeGrouped(70000)} руб.`
    );
  });

  it('addendumSlotDiscountHint только для режима руб. у слота', () => {
    const base = defaultPackageFormData();
    const form: PackageFormData = {
      ...base,
      addendumSlotCount: 1,
      addendumSlots: [
        {
          ...base.addendumSlots[0],
          discountType: 'AMOUNT',
          discountAmount: '5 000',
          snapshot: { total: 50000, rooms: [] },
        },
        ...base.addendumSlots.slice(1),
      ] as unknown as PackageFormData['addendumSlots'],
    };
    expect(addendumSlotDiscountHint(form, 0)).toBe(
      `≈ 10% → итого со скидкой ${formatMoneyWholeGrouped(45000)} руб.`
    );
  });
});
