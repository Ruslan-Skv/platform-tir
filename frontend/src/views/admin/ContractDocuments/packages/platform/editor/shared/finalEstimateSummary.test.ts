import { defaultPackageFormData } from '../../form/defaults';
import type { PackageFormData } from '../../form/types';
import {
  applyFinalEstimateDiscountToRowAmount,
  buildFinalEstimateDiscountFactors,
  buildFinalEstimateSummary,
} from './finalEstimateSummary';

function line(name: string, unit: string, quantity: number, amount: number) {
  return { name, unit, quantity, price: quantity > 0 ? amount / quantity : 0, amount };
}

describe('buildFinalEstimateSummary: части строки по источникам', () => {
  it('строка из сметы и из Д/с несёт две части; исключения вычитаются сначала из сметы', () => {
    const base = defaultPackageFormData();
    const form: PackageFormData = {
      ...base,
      contract: { ...base.contract, discountPercent: '10' },
      estimate: {
        ...base.estimate,
        snapshot: {
          total: 1000,
          rooms: [{ name: 'Зал', total: 1000, lines: [line('Полы', 'м²', 10, 1000)] }],
        },
      },
      addendumSlotCount: 2,
      addendumSlots: [
        {
          ...base.addendumSlots[0],
          snapshot: {
            total: 400,
            rooms: [{ name: 'Зал', total: 400, lines: [line('Полы', 'м²', 4, 400)] }],
          },
        },
        {
          ...base.addendumSlots[1],
          excludedSnapshot: {
            total: 500,
            rooms: [{ name: 'Зал', total: 500, lines: [line('Полы', 'м²', 5, 500)] }],
          },
        },
        ...base.addendumSlots.slice(2),
      ] as PackageFormData['addendumSlots'],
    };
    const summary = buildFinalEstimateSummary(form);
    const row = summary.rows.find((r) => r.key === 'Зал::Полы::м²');
    expect(row).toBeDefined();
    // Включено: 1000 (смета) + 400 (Д/с №1) = 1400; исключено 500 → итог 900.
    expect(row?.amount).toBe(900);
    expect(row?.quantity).toBe(9);
    // Исключение вычитается из части «смета договора» первой: 1000 − 500 = 500, Д/с №1 — 400.
    expect(row?.sourceAmounts).toEqual([
      { source: 'main', amount: 500 },
      { source: 0, amount: 400 },
    ]);
  });

  it('исключение больше включённого: части не уходят в минус, итог 0 как раньше', () => {
    const base = defaultPackageFormData();
    const form: PackageFormData = {
      ...base,
      estimate: {
        ...base.estimate,
        snapshot: {
          total: 300,
          rooms: [{ name: 'Зал', total: 300, lines: [line('Полы', 'м²', 3, 300)] }],
        },
      },
      addendumSlotCount: 1,
      addendumSlots: [
        {
          ...base.addendumSlots[0],
          snapshot: {
            total: 200,
            rooms: [{ name: 'Зал', total: 200, lines: [line('Полы', 'м²', 2, 200)] }],
          },
          excludedSnapshot: {
            total: 1000,
            rooms: [{ name: 'Зал', total: 1000, lines: [line('Полы', 'м²', 10, 1000)] }],
          },
        },
        ...base.addendumSlots.slice(1),
      ] as PackageFormData['addendumSlots'],
    };
    const summary = buildFinalEstimateSummary(form);
    const row = summary.rows.find((r) => r.key === 'Зал::Полы::м²');
    // max(0, 500 − 1000) = 0 — строка отбрасывается целиком, как в старом расчёте.
    expect(row).toBeUndefined();
  });
});

describe('скидка частей строки по источникам', () => {
  it('часть сметы — со скидкой договора, часть Д/с — со своей (замещает)', () => {
    const base = defaultPackageFormData();
    const form: PackageFormData = {
      ...base,
      contract: { ...base.contract, discountPercent: '10' },
      estimate: {
        ...base.estimate,
        snapshot: {
          total: 1000,
          rooms: [{ name: 'Зал', total: 1000, lines: [line('Полы', 'м²', 10, 1000)] }],
        },
      },
      addendumSlotCount: 1,
      addendumSlots: [
        {
          ...base.addendumSlots[0],
          discountType: 'PERCENT',
          discountPercent: '50',
          snapshot: {
            total: 200,
            rooms: [{ name: 'Зал', total: 200, lines: [line('Плинтус', 'м', 4, 200)] }],
          },
        },
        ...base.addendumSlots.slice(1),
      ] as PackageFormData['addendumSlots'],
    };
    const { factorFor } = buildFinalEstimateDiscountFactors(form);
    const floors = buildFinalEstimateSummary(form).rows.find((r) => r.key === 'Зал::Полы::м²');
    const plinth = buildFinalEstimateSummary(form).rows.find((r) => r.key === 'Зал::Плинтус::м');
    // Полы (смета, −10%): 900; Плинтус (Д/с, −50%): 100.
    expect(applyFinalEstimateDiscountToRowAmount(floors!, factorFor)).toBe(900);
    expect(applyFinalEstimateDiscountToRowAmount(plinth!, factorFor)).toBe(100);
  });

  it('смешанная строка: части считаются каждая со своей скидкой', () => {
    const base = defaultPackageFormData();
    const form: PackageFormData = {
      ...base,
      contract: { ...base.contract, discountPercent: '20' },
      estimate: {
        ...base.estimate,
        snapshot: {
          total: 1000,
          rooms: [{ name: 'Зал', total: 1000, lines: [line('Полы', 'м²', 10, 1000)] }],
        },
      },
      addendumSlotCount: 1,
      addendumSlots: [
        {
          ...base.addendumSlots[0],
          discountType: 'PERCENT',
          discountPercent: '50',
          snapshot: {
            total: 400,
            rooms: [{ name: 'Зал', total: 400, lines: [line('Полы', 'м²', 4, 400)] }],
          },
        },
        ...base.addendumSlots.slice(1),
      ] as PackageFormData['addendumSlots'],
    };
    const { factorFor } = buildFinalEstimateDiscountFactors(form);
    const row = buildFinalEstimateSummary(form).rows.find((r) => r.key === 'Зал::Полы::м²');
    // 1000 × 0.8 + 400 × 0.5 = 1000
    expect(applyFinalEstimateDiscountToRowAmount(row!, factorFor)).toBe(1000);
  });
});
