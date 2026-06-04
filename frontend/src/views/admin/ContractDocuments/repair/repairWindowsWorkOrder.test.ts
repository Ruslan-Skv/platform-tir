import {
  buildWindowsWorkOrderAddendumForTemplate,
  buildWindowsWorkOrderComputed,
} from './repairWindowsWorkOrder';

describe('buildWindowsWorkOrderComputed', () => {
  it('reduces line amounts by configured markup percent', () => {
    const computed = buildWindowsWorkOrderComputed(
      {
        rooms: [
          {
            name: 'Кухня',
            total: 1000,
            lines: [
              {
                name: 'Монтаж',
                unit: 'шт.',
                quantity: 1,
                price: 1000,
                amount: 1000,
              },
            ],
          },
        ],
        total: 1000,
      },
      '0',
      33
    );
    expect(computed.adjustedTotal).toBeCloseTo(670, 2);
    expect(computed.rooms[0]?.lines[0]?.adjustedAmount).toBeCloseTo(670, 2);
  });
});

describe('buildWindowsWorkOrderAddendumForTemplate', () => {
  it('uses work-order table html and net total after markup on both sections', () => {
    const block = buildWindowsWorkOrderAddendumForTemplate({
      slotNumber: 2,
      additionalRoomsHtml: '<table><tbody><tr><td>Монтаж</td><td>670,00</td></tr></tbody></table>',
      excludedRoomsHtml: '',
      additionalAdjustedTotal: 670,
      excludedAdjustedTotal: 0,
      formatMoney: (n) => n.toFixed(2).replace('.', ','),
    });
    expect(block.roomsHtml).toContain('Дополнительные работы');
    expect(block.roomsHtml).toContain('<table>');
    expect(block.roomsHtml).not.toContain('Итого по разделу');
    expect(block.totalAfterDeductions).toContain('670,00');
    expect(block.categoryTotalsHtml).toBe('');
  });
});
