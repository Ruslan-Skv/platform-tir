/** Общая клиентская пагинация списков план-графиков CRM (ОДПЖ / ремонт / мебель). */
import { act, renderHook } from '@testing-library/react';

import { useAdminListPagination } from './list-pagination';

const STORAGE_KEY = 'test_list_pagination';

type Props = { items: number[]; loading: boolean };

function renderPagination(initialProps: Props) {
  return renderHook(
    ({ items, loading }: Props) =>
      useAdminListPagination(items, { loading, storageKey: STORAGE_KEY }),
    {
      initialProps,
    }
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('useAdminListPagination', () => {
  it('по умолчанию 30 записей на первой странице', () => {
    const items = Array.from({ length: 75 }, (_, i) => i);
    const { result } = renderPagination({ items, loading: false });

    expect(result.current.limit).toBe(30);
    expect(result.current.page).toBe(1);
    expect(result.current.pagedItems).toHaveLength(30);
    expect(result.current.pagedItems[0]).toBe(0);
  });

  it('последняя страница содержит остаток записей', () => {
    const items = Array.from({ length: 75 }, (_, i) => i);
    const { result } = renderPagination({ items, loading: false });

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    expect(result.current.pagedItems).toHaveLength(15);
    expect(result.current.pagedItems[0]).toBe(60);
  });

  it('смена размера страницы возвращает на первую страницу', () => {
    const items = Array.from({ length: 105 }, (_, i) => i);
    const { result } = renderPagination({ items, loading: false });
    act(() => result.current.setPage(3));

    act(() => result.current.setLimit(50));
    expect(result.current.page).toBe(1);
    expect(result.current.pagedItems).toHaveLength(50);

    act(() => result.current.setLimit(100));
    expect(result.current.page).toBe(1);
    expect(result.current.pagedItems).toHaveLength(100);
  });

  it('сохранённая страница больше числа страниц возвращается на последнюю после загрузки', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ page: 5, pageLimit: 30 }));
    const items = Array.from({ length: 75 }, (_, i) => i);
    const { result, rerender } = renderPagination({ items: [], loading: true });

    // во время загрузки список пуст — страница не сбрасывается
    expect(result.current.page).toBe(5);
    expect(result.current.pagedItems).toHaveLength(0);

    rerender({ items, loading: false });
    expect(result.current.page).toBe(3);
    expect(result.current.pagedItems).toHaveLength(15);
  });

  it('страница и размер страницы сохраняются между монтированиями', () => {
    const items = Array.from({ length: 75 }, (_, i) => i);
    const first = renderPagination({ items, loading: false });
    act(() => first.result.current.setPage(2));

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved).toEqual({ page: 2, pageLimit: 30 });
    first.unmount();

    const second = renderPagination({ items, loading: false });
    expect(second.result.current.page).toBe(2);
    expect(second.result.current.pagedItems[0]).toBe(30);

    act(() => second.result.current.setLimit(50));
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      page: 1,
      pageLimit: 50,
    });
  });

  it('повреждённое хранилище не ломает пагинацию', () => {
    window.localStorage.setItem(STORAGE_KEY, '{не json');
    const items = Array.from({ length: 40 }, (_, i) => i);
    const { result } = renderPagination({ items, loading: false });

    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(30);
    expect(result.current.pagedItems).toHaveLength(30);
  });
});
