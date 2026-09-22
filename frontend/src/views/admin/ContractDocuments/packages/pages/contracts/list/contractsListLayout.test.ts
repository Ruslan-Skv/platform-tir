import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';

import { buildContractsListTableDisplayItems } from './contractsListLayout';

const pkg = (id: string, oid: string | null): ContractDocumentPackage =>
  ({ id, documentObjectId: oid }) as unknown as ContractDocumentPackage;

/** Строки приходят с сервера уже отсортированными (по дате): desc — новые выше. */
const DESC_ROWS = [
  pkg('s1', null),
  pkg('a-new', 'A'),
  pkg('s2', null),
  pkg('b-new', 'B'),
  pkg('a-old', 'A'),
  pkg('s3', null),
  pkg('b-old', 'B'),
];

function shapeOf(items: ReturnType<typeof buildContractsListTableDisplayItems>): string[] {
  return items.map((i) => {
    if (i.type === 'object') return `obj:${i.objectId}(${i.packages.length})`;
    if (i.type === 'gap') return 'gap';
    return `pkg:${i.package.id}${i.childOfObject ? '^' : ''}`;
  });
}

describe('buildContractsListTableDisplayItems (by_object)', () => {
  it('desc: объект встаёт на месте самого нового договора, карточки чередуются', () => {
    const items = buildContractsListTableDisplayItems({
      listViewMode: 'by_object',
      visibleRows: DESC_ROWS,
      expandedObjectIds: [],
      listSortOrder: 'desc',
    });
    expect(shapeOf(items)).toEqual([
      'pkg:s1',
      'gap',
      'obj:A(2)', // на месте a-new — самого нового договора объекта A
      'gap',
      'pkg:s2',
      'gap',
      'obj:B(2)', // a-old и b-old поглощены карточками своих объектов
      'gap',
      'pkg:s3',
    ]);
  });

  it('asc: объект тоже якорится по самому новому договору (последнее вхождение)', () => {
    const ascRows = [...DESC_ROWS].reverse();
    const items = buildContractsListTableDisplayItems({
      listViewMode: 'by_object',
      visibleRows: ascRows,
      expandedObjectIds: [],
      listSortOrder: 'asc',
    });
    expect(shapeOf(items)).toEqual([
      'pkg:s3',
      'gap',
      'obj:B(2)',
      'gap',
      'pkg:s2',
      'gap',
      'obj:A(2)',
      'gap',
      'pkg:s1',
    ]);
  });

  it('flat: строки отображаются как есть', () => {
    const items = buildContractsListTableDisplayItems({
      listViewMode: 'flat',
      visibleRows: DESC_ROWS,
      expandedObjectIds: [],
      listSortOrder: 'desc',
    });
    expect(shapeOf(items)).toEqual(DESC_ROWS.map((r) => `pkg:${r.id}`));
  });

  it('раскрытый объект добавляет дочерние договоры сразу после карточки', () => {
    const items = buildContractsListTableDisplayItems({
      listViewMode: 'by_object',
      visibleRows: DESC_ROWS,
      expandedObjectIds: ['A'],
      listSortOrder: 'desc',
    });
    expect(shapeOf(items)).toEqual([
      'pkg:s1',
      'gap',
      'obj:A(2)',
      'pkg:a-new^',
      'pkg:a-old^',
      'gap',
      'pkg:s2',
      'gap',
      'obj:B(2)',
      'gap',
      'pkg:s3',
    ]);
  });

  it('несколько объектов раскрыты одновременно и независимо друг от друга', () => {
    const items = buildContractsListTableDisplayItems({
      listViewMode: 'by_object',
      visibleRows: DESC_ROWS,
      expandedObjectIds: ['A', 'B'],
      listSortOrder: 'desc',
    });
    expect(shapeOf(items)).toEqual([
      'pkg:s1',
      'gap',
      'obj:A(2)',
      'pkg:a-new^',
      'pkg:a-old^',
      'gap',
      'pkg:s2',
      'gap',
      'obj:B(2)',
      'pkg:b-new^',
      'pkg:b-old^',
      'gap',
      'pkg:s3',
    ]);
  });
});
