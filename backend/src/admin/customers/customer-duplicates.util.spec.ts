import { findDuplicateReasons } from './customer-duplicates.util';

const candidate = (overrides: Partial<Parameters<typeof findDuplicateReasons>[1]>) => ({
  id: 'c1',
  firstName: 'Иван',
  lastName: 'Иванов',
  company: null,
  email: null,
  phone: '+7 (999) 111-22-33',
  phones: ['+7 (999) 111-22-33'],
  extendedProfile: { lastName: 'Иванов', firstName: 'Иван', patronymic: 'Иванович' },
  deletedAt: null,
  ...overrides,
});

describe('findDuplicateReasons', () => {
  it('совпадение телефона по цифрам независимо от форматирования', () => {
    const reasons = findDuplicateReasons({ phones: ['+79991112233'], email: null }, candidate({}));
    expect(reasons).toContain('PHONE');
  });

  it('email совпадает регистронезависимо', () => {
    const reasons = findDuplicateReasons(
      { phones: ['+79990000000'], email: 'Ivan@Mail.ru' },
      candidate({ email: 'ivan@mail.ru' }),
    );
    expect(reasons).toContain('EMAIL');
  });

  it('разные телефоны и пустой email — не дубль', () => {
    const reasons = findDuplicateReasons({ phones: ['+79990000000'], email: null }, candidate({}));
    expect(reasons).toEqual([]);
  });

  it('ФИО+телефон: полное ФИО совпало и телефон совпал', () => {
    const reasons = findDuplicateReasons(
      {
        phones: ['8 999 111 22 33'],
        email: null,
        firstName: 'Иван',
        lastName: 'Иванов',
        extendedProfile: { lastName: 'Иванов', firstName: 'Иван', patronymic: 'Иванович' },
      },
      candidate({ phones: ['+7 (999) 111-22-33'], phone: null }),
    );
    expect(reasons).toContain('FULL_NAME_WITH_PHONE');
  });

  it('ФИО без отчества не матчится по FULL_NAME_WITH_PHONE (только по телефону)', () => {
    const reasons = findDuplicateReasons(
      {
        phones: ['+79991112233'],
        email: null,
        firstName: 'Иван',
        lastName: 'Иванов',
        extendedProfile: {},
      },
      candidate({}),
    );
    expect(reasons).toEqual(['PHONE']);
  });

  it('однофамилец с другим телефоном — не дубль', () => {
    const reasons = findDuplicateReasons(
      {
        phones: ['+79995556677'],
        email: null,
        firstName: 'Иван',
        lastName: 'Иванов',
        extendedProfile: { lastName: 'Иванов', firstName: 'Иван', patronymic: 'Иванович' },
      },
      candidate({}),
    );
    expect(reasons).toEqual([]);
  });

  it('пустой вход не даёт дублей', () => {
    expect(findDuplicateReasons({ phones: [], email: null }, candidate({}))).toEqual([]);
  });
});
