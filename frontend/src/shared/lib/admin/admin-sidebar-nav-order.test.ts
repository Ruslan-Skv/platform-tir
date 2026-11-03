import { applyAdminSidebarNavOrder } from '@/shared/lib/admin/admin-sidebar-nav-order';

type Item = { href: string };

function items(...hrefs: string[]): Item[] {
  return hrefs.map((href) => ({ href }));
}

describe('applyAdminSidebarNavOrder', () => {
  it('возвращает базовый порядок при пустом navOrder', () => {
    const base = items('/a', '/b', '/c');
    expect(applyAdminSidebarNavOrder(base, [])).toEqual(base);
  });

  it('переставляет разделы по сохранённому порядку', () => {
    const base = items('/a', '/b', '/c', '/d');
    expect(applyAdminSidebarNavOrder(base, ['/c', '/a', '/d', '/b'])).toEqual(
      items('/c', '/a', '/d', '/b')
    );
  });

  it('разделы вне navOrder идут после отсортированных в базовом порядке', () => {
    const base = items('/a', '/b', '/new1', '/c', '/new2');
    expect(applyAdminSidebarNavOrder(base, ['/c', '/a'])).toEqual(
      items('/c', '/a', '/b', '/new1', '/new2')
    );
  });

  it('игнорирует href из navOrder, которых нет в меню (нет доступа)', () => {
    const base = items('/a', '/b');
    expect(applyAdminSidebarNavOrder(base, ['/gone', '/b', '/a'])).toEqual(items('/b', '/a'));
  });

  it('не мутирует исходный массив', () => {
    const base = items('/a', '/b', '/c');
    const snapshot = [...base];
    applyAdminSidebarNavOrder(base, ['/c', '/b', '/a']);
    expect(base).toEqual(snapshot);
  });
});
