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
      name: 'Зал',
      total: 1000,
      lines: [
        {
          name: 'Монтаж потолка на ПВХ-профиль, м2',
          unit: 'м²',
          quantity: 10,
          price: 100,
          amount: 1000,
        },
      ],
    },
  ],
};

describe('appendCeilingsCornersWorkOrderRoom: строка «Углы» в заказ-наряде потолков', () => {
  const buildComputed = () =>
    resolveWorkOrderComputedForTemplate(SNAPSHOT, defaultPackageFormData(), {
      packageKind: 'CEILINGS',
      windowsWorkOrderMarkupPercent: 33,
    });

  it('добавляет блок «Доп. работы» с углами по цене из настроек и не меняет сумму вычета', () => {
    const computed = buildComputed();
    const withCorners = appendCeilingsCornersWorkOrderRoom(computed, 12, 350);

    expect(withCorners.rooms).toHaveLength(computed.rooms.length + 1);
    const cornersRoom = withCorners.rooms[withCorners.rooms.length - 1]!;
    expect(cornersRoom.name).toBe('Доп. работы');
    expect(cornersRoom.lines[0]).toMatchObject({
      name: 'Углы',
      unit: 'шт',
      quantity: 12,
      adjustedPrice: 350,
      adjustedAmount: 4200,
    });
    // Цена из настроек окончательная: к ней не применяются ни скидка, ни наценка заказ-наряда.
    expect(withCorners.originalTotal).toBe(computed.originalTotal + 4200);
    expect(withCorners.adjustedTotal).toBeCloseTo(computed.adjustedTotal + 4200, 8);
    expect(withCorners.reductionAmount).toBe(computed.reductionAmount);
  });

  it('не добавляет блок при нулевом кол-ве или нулевой цене', () => {
    const computed = buildComputed();
    expect(appendCeilingsCornersWorkOrderRoom(computed, 0, 350)).toBe(computed);
    expect(appendCeilingsCornersWorkOrderRoom(computed, 12, 0)).toBe(computed);
  });
});
