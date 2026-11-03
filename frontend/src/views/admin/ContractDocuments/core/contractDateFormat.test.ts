import {
  formatContractDateDdMmYyyy,
  isContractDateTodayDdMmYyyy,
  parseContractDate,
  todayContractDateDdMmYyyy,
} from './contractDateFormat';

describe('parseContractDate', () => {
  it('разбирает дд.мм.гггг, yyyy-mm-dd, дд-мм-гггг', () => {
    expect(parseContractDate('05.11.2026')?.getTime()).toBe(new Date(2026, 10, 5).getTime());
    expect(parseContractDate('2026-11-05')?.getTime()).toBe(new Date(2026, 10, 5).getTime());
    expect(parseContractDate('2026-11-05T10:00:00.000Z')?.getTime()).toBe(
      new Date(2026, 10, 5).getTime()
    );
    expect(parseContractDate('05-11-2026')?.getTime()).toBe(new Date(2026, 10, 5).getTime());
  });

  it('мусор не разбирается', () => {
    expect(parseContractDate('')).toBeNull();
    expect(parseContractDate('32.13.2026')).toBeNull();
    expect(parseContractDate('текст')).toBeNull();
  });
});

describe('isContractDateTodayDdMmYyyy', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('сегодняшняя дата в любом поддерживаемом формате — true', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 5, 12, 0));
    expect(isContractDateTodayDdMmYyyy('05.11.2026')).toBe(true);
    expect(isContractDateTodayDdMmYyyy('2026-11-05')).toBe(true);
    expect(isContractDateTodayDdMmYyyy('05-11-2026')).toBe(true);
  });

  it('задняя, будущая, пустая и нераспознанная даты — false', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 5, 12, 0));
    expect(isContractDateTodayDdMmYyyy('04.11.2026')).toBe(false);
    expect(isContractDateTodayDdMmYyyy('06.11.2026')).toBe(false);
    expect(isContractDateTodayDdMmYyyy('')).toBe(false);
    expect(isContractDateTodayDdMmYyyy('не дата')).toBe(false);
  });
});

describe('formatContractDateDdMmYyyy / todayContractDateDdMmYyyy', () => {
  it('форматирует с ведущими нулями', () => {
    expect(formatContractDateDdMmYyyy(new Date(2026, 0, 5))).toBe('05.01.2026');
  });

  it('todayContractDateDdMmYyyy — сегодняшняя локальная дата', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 5, 23, 59));
    expect(todayContractDateDdMmYyyy()).toBe('05.11.2026');
    jest.useRealTimers();
  });
});
