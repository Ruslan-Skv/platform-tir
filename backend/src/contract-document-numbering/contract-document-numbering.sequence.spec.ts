import { isSystemContractNumberFormat } from './contract-document-number-format';

describe('isSystemContractNumberFormat', () => {
  const parts = {
    officePrefix: '77',
    managerCode: '5',
    surveyorCode: '2',
    directionLetter: 'д',
  };

  it('recognizes system numbers', () => {
    expect(isSystemContractNumberFormat('77/5/2д-3', parts)).toBe(true);
  });

  it('rejects custom numbers', () => {
    expect(isSystemContractNumberFormat('ДОГ-2026/1', parts)).toBe(false);
  });
});
