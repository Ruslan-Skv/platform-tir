/** Логика пагинации списка план-графика ОДПЖ (см. useOdpzhSchedulesPage). */
import { act, renderHook, waitFor } from '@testing-library/react';

import type { OdpzhScheduleRow } from '@/shared/api/crm/admin-odpzh-schedules';
import { getOdpzhSchedules } from '@/shared/api/crm/admin-odpzh-schedules';

import { useOdpzhSchedulesPage } from './useOdpzhSchedulesPage';

jest.mock('@/shared/api/crm/admin-odpzh-schedules', () => ({
  getOdpzhSchedules: jest.fn(),
}));

const mockedGet = getOdpzhSchedules as jest.MockedFunction<typeof getOdpzhSchedules>;

function makeRow(index: number, overrides: Partial<OdpzhScheduleRow> = {}): OdpzhScheduleRow {
  return {
    id: `row-${index}`,
    contractNumber: `№${index}`,
    kind: 'WINDOWS',
    status: 'NEW',
    customerName: `Клиент ${index}`,
    customerAddress: null,
    customerPhone: null,
    objectDescription: null,
    managerNote: null,
    contractSum: 1000,
    paidPercent: null,
    contractDate: '2026-10-01',
    workPeriodDays: 10,
    contractEndDate: '2026-10-20',
    deadlineDaysLeft: 5,
    deadlineWarning: null,
    installerNames: [],
    nearestInstallationDate: null,
    lastInstallationDate: null,
    installationsDoneCount: 0,
    installationsTotalCount: 0,
    allInstallationsDone: false,
    lastCompletedInstallationDate: null,
    closedAt: null,
    entriesCount: 0,
    entries: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function seedResponse(rows: OdpzhScheduleRow[]) {
  mockedGet.mockResolvedValue(rows);
}

async function renderPage() {
  const utils = renderHook(() => useOdpzhSchedulesPage());
  await waitFor(() => expect(utils.result.current.loading).toBe(false));
  return utils;
}

beforeEach(() => {
  mockedGet.mockReset();
  window.localStorage.clear();
});

describe('пагинация списка ОДПЖ', () => {
  it('по умолчанию 30 записей на первой странице', async () => {
    seedResponse(Array.from({ length: 75 }, (_, i) => makeRow(i)));
    const { result } = await renderPage();

    expect(result.current.limit).toBe(30);
    expect(result.current.page).toBe(1);
    expect(result.current.items).toHaveLength(75);
    expect(result.current.pagedItems).toHaveLength(30);
    expect(result.current.pagedItems[0]?.id).toBe('row-0');
  });

  it('последняя страница содержит остаток записей', async () => {
    seedResponse(Array.from({ length: 75 }, (_, i) => makeRow(i)));
    const { result } = await renderPage();

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    expect(result.current.pagedItems).toHaveLength(15);
    expect(result.current.pagedItems[0]?.id).toBe('row-60');
  });

  it('смена размера страницы возвращает на первую страницу', async () => {
    seedResponse(Array.from({ length: 75 }, (_, i) => makeRow(i)));
    const { result } = await renderPage();
    act(() => result.current.setPage(3));

    act(() => result.current.setLimit(50));
    expect(result.current.page).toBe(1);
    expect(result.current.pagedItems).toHaveLength(50);

    act(() => result.current.setLimit(100));
    expect(result.current.page).toBe(1);
    expect(result.current.pagedItems).toHaveLength(75);
  });

  it('смена фильтра статуса возвращает на первую страницу', async () => {
    seedResponse(
      Array.from({ length: 75 }, (_, i) => makeRow(i, { status: i < 35 ? 'NEW' : 'IN_PROGRESS' }))
    );
    const { result } = await renderPage();
    act(() => result.current.setPage(3));

    act(() => result.current.setStatusFilter('NEW'));
    expect(result.current.page).toBe(1);
    expect(result.current.items).toHaveLength(35);
    expect(result.current.pagedItems).toHaveLength(30);
  });

  it('сохранённая страница больше числа страниц возвращается на последнюю', async () => {
    window.localStorage.setItem(
      'admin_odpzh_schedules_pagination',
      JSON.stringify({ page: 5, pageLimit: 30 })
    );
    seedResponse(Array.from({ length: 75 }, (_, i) => makeRow(i)));
    const { result } = await renderPage();

    expect(result.current.page).toBe(3);
    expect(result.current.pagedItems).toHaveLength(15);
  });

  it('страница и размер страницы сохраняются между визитами', async () => {
    seedResponse(Array.from({ length: 75 }, (_, i) => makeRow(i)));
    const first = await renderPage();
    act(() => first.result.current.setPage(2));
    act(() => first.result.current.setLimit(50));
    first.unmount();

    const second = await renderPage();
    expect(second.result.current.limit).toBe(50);
    expect(second.result.current.page).toBe(1); // setLimit сбрасывает страницу — и это сохраняется
  });
});
