import {
  assertNoDuplicateNumbersInForm,
  extractContractNumbersFromFormData,
  normalizeContractNumberKey,
} from './contract-document-number-unique';

describe('contract-document-number-unique', () => {
  it('normalizes whitespace', () => {
    expect(normalizeContractNumberKey('  77/5/2д-3  ')).toBe('77/5/2д-3');
  });

  it('extracts main and furniture leg numbers', () => {
    expect(
      extractContractNumbersFromFormData({
        contract: { number: '77/1/1м-1' },
        furniture: {
          manufacture: { enabled: true, contract: { number: '77/1/1м-1' } },
          montage: { enabled: true, contract: { number: '77/1/1с-2' } },
          appliances: { enabled: false, contract: { number: '77/1/1т-3' } },
        },
      }),
    ).toEqual(['77/1/1м-1', '77/1/1с-2']);
  });

  it('rejects duplicates inside one form', () => {
    expect(() => assertNoDuplicateNumbersInForm(['A-1', 'A-1'])).toThrow(/повторяется/);
  });
});
