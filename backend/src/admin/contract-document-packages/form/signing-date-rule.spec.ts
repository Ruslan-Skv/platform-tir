import { BadRequestException } from '@nestjs/common';

import {
  assertSigningDatesAreToday,
  moscowTodayDdMmYyyy,
  parseContractDateParts,
} from './signing-date-rule';

const TODAY = '05.11.2026';

function formContract(date: string, status = 'IN_PROGRESS') {
  return {
    status,
    contract: { number: '12', date },
    addendumSlotCount: 1,
    addendumDocumentDates: [date],
    addendumSlots: [{ status: 'OPEN', signedAt: '' }],
  };
}

describe('parseContractDateParts', () => {
  it('разбирает дд.мм.гггг, yyyy-mm-dd и дд-мм-гггг', () => {
    expect(parseContractDateParts('05.11.2026')).toEqual({ year: 2026, month: 11, day: 5 });
    expect(parseContractDateParts('2026-11-05')).toEqual({ year: 2026, month: 11, day: 5 });
    expect(parseContractDateParts('2026-11-05T10:00:00.000Z')).toEqual({
      year: 2026,
      month: 11,
      day: 5,
    });
    expect(parseContractDateParts('05-11-2026')).toEqual({ year: 2026, month: 11, day: 5 });
  });

  it('мусор и пустые значения не разбираются', () => {
    expect(parseContractDateParts('')).toBeNull();
    expect(parseContractDateParts(undefined)).toBeNull();
    expect(parseContractDateParts('05.13.2026')).toBeNull();
    expect(parseContractDateParts('случайный текст')).toBeNull();
  });
});

describe('moscowTodayDdMmYyyy', () => {
  it('даёт сегодняшнюю дату по Москве (несмотря на TZ сервера)', () => {
    // 23:30 UTC 4 ноября = 02:30 5 ноября по Москве.
    expect(moscowTodayDdMmYyyy(new Date('2026-11-04T23:30:00Z'))).toBe('05.11.2026');
    expect(moscowTodayDdMmYyyy(new Date('2026-11-05T18:30:00Z'))).toBe('05.11.2026');
    expect(moscowTodayDdMmYyyy(new Date('2026-12-31T21:30:00Z'))).toBe('01.01.2027');
  });
});

describe('assertSigningDatesAreToday — договор', () => {
  it('подписание сегодняшней датой проходит', () => {
    expect(() =>
      assertSigningDatesAreToday({
        storedStatus: 'IN_PROGRESS',
        incomingStatus: 'CONTRACT_CONCLUDED',
        storedFormData: formContract(TODAY),
        incomingFormData: formContract(TODAY),
        todayDdMmYyyy: TODAY,
      }),
    ).not.toThrow();
  });

  it('подписание задней датой запрещено', () => {
    expect(() =>
      assertSigningDatesAreToday({
        storedStatus: 'IN_PROGRESS',
        incomingStatus: 'CONTRACT_CONCLUDED',
        storedFormData: formContract('01.01.2025'),
        incomingFormData: formContract('01.01.2025'),
        todayDdMmYyyy: TODAY,
      }),
    ).toThrow(BadRequestException);
  });

  it('пустая и нераспознанная дата запрещены', () => {
    for (const bad of ['', '32.13.2026', 'не дата']) {
      expect(() =>
        assertSigningDatesAreToday({
          storedStatus: 'IN_PROGRESS',
          incomingStatus: 'CONTRACT_CONCLUDED',
          storedFormData: formContract(bad),
          incomingFormData: formContract(bad),
          todayDdMmYyyy: TODAY,
        }),
      ).toThrow(BadRequestException);
    }
  });

  it('уже подписанный договор не пересматривается (правки без перехода статуса)', () => {
    expect(() =>
      assertSigningDatesAreToday({
        storedStatus: 'CONTRACT_CONCLUDED',
        incomingStatus: 'CONTRACT_CONCLUDED',
        storedFormData: formContract('01.01.2025', 'CONTRACT_CONCLUDED'),
        incomingFormData: formContract('01.01.2025', 'CONTRACT_CONCLUDED'),
        todayDdMmYyyy: TODAY,
      }),
    ).not.toThrow();
  });

  it('датировка в legacy-формате yyyy-mm-dd равна сегодняшней — проходит', () => {
    expect(() =>
      assertSigningDatesAreToday({
        storedStatus: 'IN_PROGRESS',
        incomingStatus: 'CONTRACT_CONCLUDED',
        storedFormData: formContract('2026-11-05'),
        incomingFormData: formContract('2026-11-05'),
        todayDdMmYyyy: TODAY,
      }),
    ).not.toThrow();
  });
});

describe('assertSigningDatesAreToday — доп. соглашения', () => {
  function addendumForm(date: string, slotStatus: string) {
    return {
      contract: { number: '12', date: TODAY },
      addendumSlotCount: 1,
      addendumDocumentDates: [date],
      addendumSlots: [{ status: slotStatus, signedAt: slotStatus === 'SIGNED' ? 'now' : '' }],
    };
  }

  it('переход OPEN → SIGNED с сегодняшней датой проходит', () => {
    expect(() =>
      assertSigningDatesAreToday({
        storedStatus: 'CONTRACT_CONCLUDED',
        incomingStatus: undefined,
        storedFormData: addendumForm(TODAY, 'OPEN'),
        incomingFormData: addendumForm(TODAY, 'SIGNED'),
        todayDdMmYyyy: TODAY,
      }),
    ).not.toThrow();
  });

  it('переход OPEN → SIGNED с задней датой запрещён', () => {
    expect(() =>
      assertSigningDatesAreToday({
        storedStatus: 'CONTRACT_CONCLUDED',
        incomingStatus: undefined,
        storedFormData: addendumForm('01.01.2025', 'OPEN'),
        incomingFormData: addendumForm('01.01.2025', 'SIGNED'),
        todayDdMmYyyy: TODAY,
      }),
    ).toThrow(/Доп\. соглашение №1/);
  });

  it('переход OPEN → SIGNED с пустой датой запрещён', () => {
    expect(() =>
      assertSigningDatesAreToday({
        storedStatus: 'CONTRACT_CONCLUDED',
        incomingStatus: undefined,
        storedFormData: addendumForm('', 'OPEN'),
        incomingFormData: addendumForm('', 'SIGNED'),
        todayDdMmYyyy: TODAY,
      }),
    ).toThrow(BadRequestException);
  });

  it('уже подписанное Д/с (SIGNED → SIGNED) не пересматривается', () => {
    expect(() =>
      assertSigningDatesAreToday({
        storedStatus: 'CONTRACT_CONCLUDED',
        incomingStatus: undefined,
        storedFormData: addendumForm('01.01.2025', 'SIGNED'),
        incomingFormData: addendumForm('01.01.2025', 'SIGNED'),
        todayDdMmYyyy: TODAY,
      }),
    ).not.toThrow();
  });

  it('отмена оплаты (PAID → SIGNED) — не подписание, дата не проверяется', () => {
    expect(() =>
      assertSigningDatesAreToday({
        storedStatus: 'CONTRACT_CONCLUDED',
        incomingStatus: undefined,
        storedFormData: addendumForm('01.01.2025', 'PAID'),
        incomingFormData: addendumForm('01.01.2025', 'SIGNED'),
        todayDdMmYyyy: TODAY,
      }),
    ).not.toThrow();
  });
});
