import { getCrmCustomers } from '@/shared/api/admin-crm';

import { normalizePhoneMatchKey, resolveUniqueCrmCustomerByPhones } from './crmCustomerPhoneMatch';

jest.mock('@/shared/api/admin-crm', () => ({
  getCrmCustomers: jest.fn(),
}));

const getCrmCustomersMock = getCrmCustomers as jest.MockedFunction<typeof getCrmCustomers>;

function card(id: string, phones: string[]) {
  return {
    id,
    firstName: 'Тест',
    lastName: 'Тестов',
    phone: phones[0] ?? null,
    phones,
  } as Awaited<ReturnType<typeof getCrmCustomers>>['data'][number];
}

describe('normalizePhoneMatchKey', () => {
  it('не различает +7, 8 и прямое число', () => {
    expect(normalizePhoneMatchKey('+7 (964) 684-88-88')).toBe(
      normalizePhoneMatchKey('89646848888')
    );
    expect(normalizePhoneMatchKey('89646848888')).toBe('9646848888');
  });
});

describe('resolveUniqueCrmCustomerByPhones', () => {
  it('единственная карточка с таким телефоном — возвращает её id', async () => {
    getCrmCustomersMock.mockResolvedValue({
      data: [card('c1', ['+7 964 684-88-88']), card('c2', ['+7 999 111-22-33'])],
      total: 2,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
    await expect(resolveUniqueCrmCustomerByPhones(['89646848888'])).resolves.toBe('c1');
  });

  it('несколько карточек с телефоном — неоднозначно, null', async () => {
    getCrmCustomersMock.mockResolvedValue({
      data: [card('c1', ['8 (964) 684-88-88']), card('c2', ['+7 964 684 88 88'])],
      total: 2,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
    await expect(resolveUniqueCrmCustomerByPhones(['+79646848888'])).resolves.toBe(null);
  });

  it('нет совпадений или ошибка поиска — null', async () => {
    getCrmCustomersMock.mockResolvedValue({
      data: [card('c2', ['+7 999 111-22-33'])],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
    await expect(resolveUniqueCrmCustomerByPhones(['9646888888'])).resolves.toBe(null);
    getCrmCustomersMock.mockRejectedValue(new Error('network'));
    await expect(resolveUniqueCrmCustomerByPhones(['9646888888'])).resolves.toBe(null);
  });
});
