import {
  composeCrmStructuredAddress,
  emptyCrmStructuredAddress,
  hasCrmStructuredAddressContent,
  parseCrmStructuredAddress,
} from './crmCustomerStructuredAddress';

describe('crmCustomerStructuredAddress', () => {
  it('автосклейка собирает строку с сокращениями', () => {
    expect(
      composeCrmStructuredAddress({
        city: 'Москва',
        street: 'ул. Ленина',
        house: '10',
        building: '2',
        apartment: '15',
      })
    ).toBe('г. Москва, ул. Ленина, д. 10, корп. 2, кв. 15');
  });

  it('пустые части пропускаются, индекс не входит в строку', () => {
    expect(
      composeCrmStructuredAddress({
        ...emptyCrmStructuredAddress(),
        city: 'Тула',
        street: 'пр-т Мира',
      })
    ).toBe('г. Тула, пр-т Мира');
  });

  it('пустая структура не считается заполненной', () => {
    expect(hasCrmStructuredAddressContent(emptyCrmStructuredAddress())).toBe(false);
    expect(hasCrmStructuredAddressContent({ ...emptyCrmStructuredAddress(), house: '5' })).toBe(
      true
    );
  });

  it('parse возвращает null для пустой/отсутствующей структуры', () => {
    expect(parseCrmStructuredAddress(undefined)).toBeNull();
    expect(parseCrmStructuredAddress({})).toBeNull();
    expect(parseCrmStructuredAddress({ addressStructured: {} })).toBeNull();
  });

  it('parse читает сохранённую структуру', () => {
    expect(
      parseCrmStructuredAddress({
        addressStructured: { city: 'Москва', street: 'ул. Ленина' },
      })
    ).toEqual({
      city: 'Москва',
      street: 'ул. Ленина',
      house: '',
      building: '',
      apartment: '',
    });
  });
});
