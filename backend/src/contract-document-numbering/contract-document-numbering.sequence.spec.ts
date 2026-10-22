import {
  isSystemContractNumberFormat,
  parseSystemContractNumber,
} from './contract-document-number-format';

describe('isSystemContractNumberFormat', () => {
  const parts = {
    officePrefix: '77',
    managerCode: '5',
    surveyorCode: '2',
    directionLetter: 'д',
  };

  it('recognizes system numbers', () => {
    expect(isSystemContractNumberFormat('7752д-3', parts)).toBe(true);
  });

  it('rejects custom numbers', () => {
    expect(isSystemContractNumberFormat('ДОГ-2026/1', parts)).toBe(false);
  });
});

describe('parseSystemContractNumber', () => {
  const parts = { officePrefix: '77', managerCode: '5', surveyorCode: '2' };

  it('разбирает текущий формат: буква и порядковый номер', () => {
    expect(parseSystemContractNumber('7752д-3', parts)).toEqual({
      directionLetter: 'д',
      sequence: 3,
    });
  });

  it('разбирает ноги мебели: буквы м / с / т', () => {
    expect(parseSystemContractNumber('7752м-12', parts)).toEqual({
      directionLetter: 'м',
      sequence: 12,
    });
    expect(parseSystemContractNumber('7752с-12', parts)).toEqual({
      directionLetter: 'с',
      sequence: 12,
    });
    expect(parseSystemContractNumber('7752т-12', parts)).toEqual({
      directionLetter: 'т',
      sequence: 12,
    });
  });

  it('разбирает легаси-номера со слэшами', () => {
    expect(parseSystemContractNumber('77/5/2д-7', parts)).toEqual({
      directionLetter: 'д',
      sequence: 7,
    });
  });

  it('отклоняет произвольные номера и чужие префиксы', () => {
    expect(parseSystemContractNumber('ДОГ-2026/1', parts)).toBeNull();
    expect(parseSystemContractNumber('9952д-3', parts)).toBeNull();
    expect(parseSystemContractNumber('7752д-', parts)).toBeNull();
    expect(parseSystemContractNumber('7752д-0', parts)).toBeNull();
  });
});
