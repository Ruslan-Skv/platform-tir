import { ContractDocumentPackageKind } from '@prisma/client';

import { computeInstallerAccrual, parseInstallerGradePercent } from './installer-accrual';

const ROOM_LINE = (name: string, unit: string, quantity: number, amount: number) => ({
  name,
  unit,
  quantity,
  price: quantity > 0 ? amount / quantity : 0,
  amount,
});

describe('parseInstallerGradePercent', () => {
  it('разряд ≥6 → 10%, 5 → 5%, иначе 0', () => {
    expect(parseInstallerGradePercent('6 разряд')).toBe(10);
    expect(parseInstallerGradePercent('5')).toBe(5);
    expect(parseInstallerGradePercent('4 разряд')).toBe(0);
    expect(parseInstallerGradePercent('без разряда')).toBe(0);
  });
});

describe('computeInstallerAccrual', () => {
  const grades = new Map<string, string>([
    ['master-a', '5 разряд'],
    ['master-c', '6 разряд'],
  ]);

  it('ремонт: скидка × налог × наценка × разряд мастера, назначенные строки', () => {
    const accrued = computeInstallerAccrual({
      kind: ContractDocumentPackageKind.REPAIR,
      installerGradeById: grades,
      formData: {
        contract: { discountPercent: '10' },
        workOrder: { taxPercent: '8', markupPercent: '43', gradeIncreasePercent: 10 },
        estimate: {
          snapshot: {
            rooms: [
              {
                name: 'Кухня',
                lines: [ROOM_LINE('Плитка', 'м²', 10, 1000), ROOM_LINE('Сантехника', 'шт', 5, 500)],
              },
            ],
          },
        },
        addendumSlotCount: 0,
        addendumSlots: [],
        finalEstimateInstallerAssignments: {
          'Кухня::Плитка::м²': { installerId: 'master-a' },
          'Кухня::Сантехника::шт': { installerId: 'master-b' },
        },
      },
    });

    // master-a: 1000 × 0.9 × 0.92 × 0.57 × 1.05 = 495.558
    expect(accrued.get('master-a')?.lineCount).toBe(1);
    expect(accrued.get('master-a')?.total).toBeCloseTo(495.558, 6);
    // master-b нет в справочнике → разряд из поля заказ-наряда (10%):
    // 500 × 0.9 × 0.92 × 0.57 × 1.1 = 259.578
    expect(accrued.get('master-b')?.lineCount).toBe(1);
    expect(accrued.get('master-b')?.total).toBeCloseTo(259.578, 6);
  });

  it('товарное направление: без налога и разряда, наценка из настроек направления', () => {
    const accrued = computeInstallerAccrual({
      kind: ContractDocumentPackageKind.WINDOWS,
      productMarkupPercent: 40,
      installerGradeById: grades,
      formData: {
        contract: { discountPercent: '5' },
        // Налог/наценка пакета и разряд мастера игнорируются для товарных направлений.
        workOrder: { taxPercent: '20', markupPercent: '10', gradeIncreasePercent: 10 },
        estimate: {
          snapshot: { rooms: [{ name: 'Объект', lines: [ROOM_LINE('Монтаж', 'шт', 2, 2000)] }] },
        },
        addendumSlotCount: 0,
        addendumSlots: [],
        finalEstimateInstallerAssignments: {
          'Объект::Монтаж::шт': { installerId: 'master-c' },
        },
      },
    });

    // 2000 × 0.95 × (1 − 0.4) = 1140
    expect(accrued.get('master-c')).toEqual({
      installerId: 'master-c',
      total: 1140,
      lineCount: 1,
    });
  });

  it('Д/с: доп. работы плюсуются, исключённые вычитаются, слоты за пределами addendumSlotCount не считаются', () => {
    const accrued = computeInstallerAccrual({
      kind: ContractDocumentPackageKind.REPAIR,
      installerGradeById: grades,
      formData: {
        contract: { discountPercent: '0' },
        workOrder: { taxPercent: '0', markupPercent: '0', gradeIncreasePercent: 0 },
        estimate: {
          snapshot: { rooms: [{ name: 'Зал', lines: [ROOM_LINE('Полы', 'м²', 10, 1000)] }] },
        },
        addendumSlotCount: 1,
        addendumSlots: [
          {
            snapshot: { rooms: [{ name: 'Зал', lines: [ROOM_LINE('Плинтус', 'м', 4, 200)] }] },
            excludedSnapshot: {
              rooms: [{ name: 'Зал', lines: [ROOM_LINE('Полы', 'м²', 4, 400)] }],
            },
          },
          {
            // Слот №2 неактивен (addendumSlotCount = 1) — прибавка не учитывается.
            snapshot: { rooms: [{ name: 'Зал', lines: [ROOM_LINE('Полы', 'м²', 1, 9999)] }] },
            excludedSnapshot: null,
          },
        ],
        // master-x нет в справочнике → разряд из заказ-наряда (0%)
        finalEstimateInstallerAssignments: {
          'Зал::Полы::м²': { installerId: 'master-x' },
          'Зал::Плинтус::м': { installerId: 'master-x' },
        },
      },
    });

    // Полы: 1000 − 400 = 600; Плинтус: +200 → итого 800
    expect(accrued.get('master-x')?.total).toBe(800);
    expect(accrued.get('master-x')?.lineCount).toBe(2);
  });

  it('без назначений мастеров начислений нет', () => {
    const accrued = computeInstallerAccrual({
      kind: ContractDocumentPackageKind.REPAIR,
      installerGradeById: grades,
      formData: {
        contract: { discountPercent: '0' },
        estimate: {
          snapshot: { rooms: [{ name: 'Зал', lines: [ROOM_LINE('Полы', 'м²', 10, 1000)] }] },
        },
      },
    });
    expect(accrued.size).toBe(0);
  });
});
