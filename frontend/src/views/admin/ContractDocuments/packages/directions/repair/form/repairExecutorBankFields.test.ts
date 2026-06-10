import { parseExecutorBankDetails } from './repairExecutorBankFields';

describe('parseExecutorBankDetails', () => {
  it('parses Sber-style accounts labeled as Счёт №', () => {
    const parsed = parseExecutorBankDetails(
      `МУРМАНСКОЕ ОТДЕЛЕНИЕ N8627 ПАО СБЕРБАНК
БИК 044705615
Счёт № 30101 81030 00000 00615
Счёт № 40802 81034 10000 04571`
    );

    expect(parsed.bik).toBe('044705615');
    expect(parsed.corrAccount.replace(/\s/g, '')).toBe('30101810300000000615');
    expect(parsed.settlementAccount.replace(/\s/g, '')).toBe('40802810341000004571');
  });
});
