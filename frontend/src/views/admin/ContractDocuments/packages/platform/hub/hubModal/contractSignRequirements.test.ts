import { collectContractSignRequirements } from './contractSignRequirements';

const filledCustomer = {
  type: 'PERSON' as const,
  fullName: 'Сидоров Петр Петрович',
  phone: '+79646848888',
  phones: ['+79646848888'],
};

const filled = {
  packageKind: 'DOORS' as const,
  customer: filledCustomer,
  contractNumber: '77/3/1д-6',
  contractDate: '28.09.2026',
  objectAddress: 'г. Мурманск ул. Книповича д.5 кв. 11',
  executorProfileTitle: 'ИП Сквиря Р.В.',
  signatoryProfileTitle: 'Петрова М.И.',
};

describe('collectContractSignRequirements', () => {
  it('всё заполнено (данные заказчика — из блока «Заказчик», карточку через поиск можно не выбирать) — подписывать можно', () => {
    expect(collectContractSignRequirements(filled)).toEqual([]);
  });

  it('перечисляет все незаполненные поля вкладки «Данные»', () => {
    const missing = collectContractSignRequirements({
      ...filled,
      customer: { ...filledCustomer, fullName: '', phone: '', phones: [''] },
      executorProfileTitle: '',
      signatoryProfileTitle: '',
      contractNumber: '',
      contractDate: '',
      objectAddress: '',
    });
    expect(missing).toEqual([
      'данные заказчика — блок «Заказчик»',
      'карточка исполнителя (справочник «Исполнители»)',
      'карточка менеджера (справочник «Карточка менеджера»)',
      'номер договора («Номер дог.»)',
      'дата заключения («Дата закл.»)',
      'адрес объекта',
    ]);
  });

  it('Мебель: проверяется только блок «Заказчик»', () => {
    const missing = collectContractSignRequirements({
      ...filled,
      packageKind: 'FURNITURE',
      customer: { ...filledCustomer, fullName: '', phone: '', phones: [] },
      executorProfileTitle: '',
      signatoryProfileTitle: '',
      contractNumber: '',
      contractDate: '',
      objectAddress: '',
    });
    expect(missing).toEqual(['данные заказчика — блок «Заказчик»']);
  });

  it('пробелы считаются незаполненными', () => {
    const missing = collectContractSignRequirements({
      ...filled,
      objectAddress: '   ',
    });
    expect(missing).toEqual(['адрес объекта']);
  });
});
