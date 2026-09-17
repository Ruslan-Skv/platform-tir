import { contractsListContractTotalAmount } from './contractsListUtils';

describe('contractsListContractTotalAmount', () => {
  it('берёт сумму договора из формы (то же значение, что видно в пакете)', () => {
    expect(
      contractsListContractTotalAmount({
        contract: { totalAmount: '17474,00' },
      })
    ).toBe(17474);
  });

  it('пробелы и точка-разделитель тоже поддерживаются', () => {
    expect(contractsListContractTotalAmount({ contract: { totalAmount: '17 474,50' } })).toBe(
      17474.5
    );
    expect(contractsListContractTotalAmount({ contract: { totalAmount: '17474.50' } })).toBe(
      17474.5
    );
  });

  it('пустая сумма в форме — фолбэк на смету (снимок + скидка)', () => {
    expect(
      contractsListContractTotalAmount({
        contract: { totalAmount: '', discountPercent: '' },
        estimate: { selectedPresetId: 'est1', snapshot: { total: 20000 } },
      })
    ).toBe(20000);
  });

  it('нет ни суммы, ни сметы — null', () => {
    expect(contractsListContractTotalAmount({})).toBeNull();
    expect(contractsListContractTotalAmount({ estimate: { selectedPresetId: 'est1' } })).toBeNull();
  });
});
