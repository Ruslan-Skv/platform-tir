import type { DoorsSupplierOption } from '@/shared/api/admin-contract-document-packages';

import {
  filterDoorsSupplierOptions,
  isSameSupplierIds,
  orderSupplierIdsByOptions,
  toggleSupplierId,
} from './doorsSuppliersSettingsUtils';

const options: DoorsSupplierOption[] = [
  { id: 'a', title: 'АВС', legalName: 'ООО «АВС»', isActive: true },
  { id: 'b', title: 'Бау-Мастер', legalName: 'ООО «Стройком»', isActive: true },
  { id: 'c', title: 'Север', legalName: 'ООО «Север»', isActive: false },
];

describe('toggleSupplierId', () => {
  it('добавляет отсутствующий id', () => {
    expect(toggleSupplierId(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('убирает уже отмеченный id', () => {
    expect(toggleSupplierId(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('isSameSupplierIds', () => {
  it('порядок не важен', () => {
    expect(isSameSupplierIds(['a', 'b'], ['b', 'a'])).toBe(true);
  });

  it('разный состав или количество — не равны', () => {
    expect(isSameSupplierIds(['a', 'b'], ['a'])).toBe(false);
    expect(isSameSupplierIds(['a'], ['a', 'c'])).toBe(false);
  });
});

describe('orderSupplierIdsByOptions', () => {
  it('расставляет отмеченных в порядке справочника', () => {
    expect(orderSupplierIdsByOptions(['c', 'a'], options)).toEqual(['a', 'c']);
  });

  it('пропускает id, которых нет в справочнике', () => {
    expect(orderSupplierIdsByOptions(['a', 'missing'], options)).toEqual(['a']);
  });
});

describe('filterDoorsSupplierOptions', () => {
  it('пустой поиск — весь список', () => {
    expect(filterDoorsSupplierOptions(options, '   ')).toEqual(options);
  });

  it('ищет по коммерческому и юридическому названию без учёта регистра', () => {
    expect(filterDoorsSupplierOptions(options, 'стройком').map((o) => o.id)).toEqual(['b']);
    expect(filterDoorsSupplierOptions(options, 'АВС').map((o) => o.id)).toEqual(['a']);
  });

  it('без совпадений — пустой список', () => {
    expect(filterDoorsSupplierOptions(options, 'нет такого')).toEqual([]);
  });
});
