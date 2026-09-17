import {
  attributeUnlinkedDoc,
  buildCustomerDisplayNameIndex,
  buildCustomerPhoneIndex,
} from './customer-doc-attribution.util';

describe('customer-doc-attribution', () => {
  const customers = [
    { id: 'c1', phone: '+7 (999) 111-22-33', phones: [] as string[] },
    { id: 'c2', phone: null, phones: ['8 999 555-66-77'] },
  ];

  it('телефон матчится независимо от форматирования (8/+7)', () => {
    const phoneIndex = buildCustomerPhoneIndex(customers);
    expect(attributeUnlinkedDoc({ customerPhone: '89991112233' }, phoneIndex, new Map())).toBe(
      'c1',
    );
    expect(attributeUnlinkedDoc({ customerPhone: '+7 999 555-66-77' }, phoneIndex, new Map())).toBe(
      'c2',
    );
  });

  it('неизвестный телефон без ФИО не атрибутируется', () => {
    const phoneIndex = buildCustomerPhoneIndex(customers);
    expect(
      attributeUnlinkedDoc({ customerPhone: '+79990000000' }, phoneIndex, new Map()),
    ).toBeNull();
  });

  it('ФИО матчится при однозначном совпадении (регистр и пробелы не важны)', () => {
    const displayNameIndex = buildCustomerDisplayNameIndex([
      { id: 'c1', displayName: 'Иванов Иван Иванович' },
      { id: 'c2', displayName: 'Петров Пётр' },
    ]);
    expect(
      attributeUnlinkedDoc(
        { customerName: '  иванов иван иванович ' },
        new Map(),
        displayNameIndex,
      ),
    ).toBe('c1');
  });

  it('неоднозначное ФИО не атрибутируется', () => {
    const displayNameIndex = buildCustomerDisplayNameIndex([
      { id: 'c1', displayName: 'Иванов Иван' },
      { id: 'c2', displayName: 'иванов иван' },
    ]);
    expect(displayNameIndex.size).toBe(0);
    expect(
      attributeUnlinkedDoc({ customerName: 'Иванов Иван' }, new Map(), displayNameIndex),
    ).toBeNull();
  });

  it('телефон приоритетнее ФИО', () => {
    const phoneIndex = buildCustomerPhoneIndex(customers);
    const displayNameIndex = buildCustomerDisplayNameIndex([
      { id: 'c2', displayName: 'Иванов Иван' },
    ]);
    expect(
      attributeUnlinkedDoc(
        { customerName: 'Иванов Иван', customerPhone: '+79991112233' },
        phoneIndex,
        displayNameIndex,
      ),
    ).toBe('c1');
  });
});
