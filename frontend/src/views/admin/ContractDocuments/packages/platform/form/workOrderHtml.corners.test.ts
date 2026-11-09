import { defaultPackageFormData } from './defaults';
import type { PackageFormData } from './types';
import {
  appendCeilingsCornersWorkOrderRoom,
  resolveWorkOrderComputedForTemplate,
} from './workOrderHtml';

const SNAPSHOT: NonNullable<PackageFormData['estimate']['snapshot']> = {
  total: 1000,
  rooms: [
    {
      name: 'Кухня',
      total: 600,
      lines: [
        {
          name: 'Монтаж потолка на ПВХ-профиль, м2',
          unit: 'м²',
          quantity: 6,
          price: 100,
          amount: 600,
        },
      ],
    },
    {
      name: 'Коридор',
      total: 400,
      lines: [
        {
          name: 'Монтаж потолка на ПВХ-профиль, м2',
          unit: 'м²',
          quantity: 4,
          price: 100,
          amount: 400,
        },
      ],
    },
  ],
};

describe('appendCeilingsCornersWorkOrderRoom: строки «Углы» в заказ-наряде потолков', () => {
  const buildComputed = () =>
    resolveWorkOrderComputedForTemplate(SNAPSHOT, defaultPackageFormData(), {
      packageKind: 'CEILINGS',
      windowsWorkOrderMarkupPercent: 33,
    });

  it('добавляет строку «Углы» в каждое помещение по порядку потолков спецификации', () => {
    const computed = buildComputed();
    // Потолок №1 (12 углов) → «Кухня», Потолок №2 (6 углов) → «Коридор».
    const withCorners = appendCeilingsCornersWorkOrderRoom(computed, [12, 6], 350);

    expect(withCorners.rooms).toHaveLength(computed.rooms.length);
    const [kitchen, corridor] = withCorners.rooms;
    expect(kitchen!.name).toBe('Кухня');
    expect(kitchen!.lines).toHaveLength(2);
    expect(kitchen!.lines[1]).toMatchObject({
      name: 'Углы',
      unit: 'шт',
      quantity: 12,
      adjustedPrice: 350,
      adjustedAmount: 4200,
    });
    expect(corridor!.name).toBe('Коридор');
    expect(corridor!.lines[1]).toMatchObject({ name: 'Углы', quantity: 6, adjustedAmount: 2100 });

    // Цена из настроек окончательная: к ней не применяются ни скидка, ни наценка заказ-наряда.
    expect(kitchen!.adjustedTotal).toBeCloseTo(computed.rooms[0]!.adjustedTotal + 4200, 8);
    expect(corridor!.adjustedTotal).toBeCloseTo(computed.rooms[1]!.adjustedTotal + 2100, 8);
    expect(withCorners.originalTotal).toBe(computed.originalTotal + 4200 + 2100);
    expect(withCorners.adjustedTotal).toBeCloseTo(computed.adjustedTotal + 6300, 8);
    expect(withCorners.reductionAmount).toBe(computed.reductionAmount);
  });

  it('потолок без углов не добавляет строку, но занимает свой порядковый индекс', () => {
    const computed = buildComputed();
    // Потолок №1 без углов, Потолок №2 (6) → «Коридор»; «Кухня» остаётся без строки.
    const withCorners = appendCeilingsCornersWorkOrderRoom(computed, [0, 6], 350);
    expect(withCorners.rooms[0]!.lines).toHaveLength(1);
    expect(withCorners.rooms[1]!.lines[1]).toMatchObject({ name: 'Углы', quantity: 6 });
    expect(withCorners.adjustedTotal).toBeCloseTo(computed.adjustedTotal + 2100, 8);
  });

  it('потолков больше, чем помещений — остаток в последнее помещение одной строкой', () => {
    const computed = buildComputed();
    // Потолки №1-3 → «Кухня», «Коридор», «Коридор» (остаток суммируется).
    const withCorners = appendCeilingsCornersWorkOrderRoom(computed, [12, 6, 2], 350);
    expect(withCorners.rooms[0]!.lines[1]).toMatchObject({ quantity: 12 });
    expect(withCorners.rooms[1]!.lines).toHaveLength(2);
    expect(withCorners.rooms[1]!.lines[1]).toMatchObject({ name: 'Углы', quantity: 8 });
    expect(withCorners.adjustedTotal).toBeCloseTo(computed.adjustedTotal + 20 * 350, 8);
  });

  it('не добавляет строк при нулевой цене или отсутствии углов', () => {
    const computed = buildComputed();
    expect(appendCeilingsCornersWorkOrderRoom(computed, [12], 0)).toBe(computed);
    expect(appendCeilingsCornersWorkOrderRoom(computed, [0, 0], 350)).toBe(computed);
  });

  it('без помещений — отдельный блок «Доп. работы» со строкой «Углы»', () => {
    const emptySnapshot: PackageFormData['estimate']['snapshot'] = { total: 0, rooms: [] };
    const computed = resolveWorkOrderComputedForTemplate(emptySnapshot, defaultPackageFormData(), {
      packageKind: 'CEILINGS',
      windowsWorkOrderMarkupPercent: 33,
    });
    const withCorners = appendCeilingsCornersWorkOrderRoom(computed, [8], 200);
    expect(withCorners.rooms).toHaveLength(1);
    expect(withCorners.rooms[0]).toMatchObject({ name: 'Доп. работы' });
    expect(withCorners.rooms[0]!.lines[0]).toMatchObject({ name: 'Углы', quantity: 8 });
    expect(withCorners.adjustedTotal).toBe(1600);
  });
});
