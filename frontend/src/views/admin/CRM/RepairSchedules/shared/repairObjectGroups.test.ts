import type { RepairScheduleProject } from '@/shared/api/crm/admin-repair-schedules';

import { buildRepairObjectGroups, repairObjectGroupStatus } from './repairObjectGroups';

function makeProject(overrides: Partial<RepairScheduleProject>): RepairScheduleProject {
  return {
    id: 'p1',
    status: 'NEW',
    contractNumber: 'Т-1',
    workScope: null,
    installerId: null,
    installerName: null,
    packageId: null,
    customerName: 'Иванов',
    customerAddress: 'Мурманск, Ленина 5',
    customerPhone: null,
    contractSum: null,
    payoutSum: null,
    furnitureInfo: null,
    workPeriodDays: null,
    workStartActDate: null,
    workCloseActDate: null,
    plannedStartDate: null,
    closedAt: null,
    note: null,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    latestEntry: null,
    stale: false,
    staleDays: 7,
    ...overrides,
  } as RepairScheduleProject;
}

describe('buildRepairObjectGroups: блоки объекта по датам подписания', () => {
  it('договоры одного объекта в пределах 2 месяцев — один блок', () => {
    const groups = buildRepairObjectGroups([
      makeProject({ id: 'a', contractDate: '2026-08-01' }),
      makeProject({ id: 'b', contractDate: '2026-09-25' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].projects.map((p) => p.id)).toEqual(['a', 'b']);
    expect(groups[0].isCluster).toBe(true);
  });

  it('поэтапный ремонт с разрывом больше 2 месяцев — отдельные блоки', () => {
    const groups = buildRepairObjectGroups([
      makeProject({ id: 'a', contractDate: '2026-01-15' }),
      makeProject({ id: 'b', contractDate: '2026-06-01' }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.isCluster === false)).toBe(true);
  });

  it('граница ровно 2 месяца — вместе; день спустя — раздельно', () => {
    const together = buildRepairObjectGroups([
      makeProject({ id: 'a', contractDate: '2026-01-31' }),
      makeProject({ id: 'b', contractDate: '2026-03-31' }),
    ]);
    expect(together).toHaveLength(1);

    const apart = buildRepairObjectGroups([
      makeProject({ id: 'a', contractDate: '2026-01-31' }),
      makeProject({ id: 'b', contractDate: '2026-04-01' }),
    ]);
    expect(apart).toHaveLength(2);
  });

  it('без даты договора используется дата создания', () => {
    const groups = buildRepairObjectGroups([
      makeProject({ id: 'a', createdAt: '2026-02-01T10:00:00.000Z' }),
      makeProject({ id: 'b', createdAt: '2026-09-01T10:00:00.000Z' }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it('разные объекты не склеиваются', () => {
    const groups = buildRepairObjectGroups([
      makeProject({
        id: 'a',
        customerName: 'Иванов',
        customerAddress: 'Мурманск, Ленина 5',
        contractDate: '2026-08-01',
      }),
      makeProject({
        id: 'b',
        customerName: 'Петров',
        customerAddress: 'Мурманск, Полярные Зори 7',
        contractDate: '2026-08-02',
      }),
    ]);
    expect(groups).toHaveLength(2);
  });
});

describe('repairObjectGroupStatus: раздел блока', () => {
  it('любой в работе → блок в работе', () => {
    expect(
      repairObjectGroupStatus([
        makeProject({ status: 'NEW' }),
        makeProject({ status: 'IN_PROGRESS' }),
        makeProject({ status: 'CLOSED' }),
      ])
    ).toBe('IN_PROGRESS');
  });

  it('новые + закрытые без работ → блок в новых (ждёт начала работ)', () => {
    expect(
      repairObjectGroupStatus([makeProject({ status: 'NEW' }), makeProject({ status: 'CLOSED' })])
    ).toBe('NEW');
  });

  it('все закрыты → блок закрыт', () => {
    expect(
      repairObjectGroupStatus([
        makeProject({ status: 'CLOSED' }),
        makeProject({ status: 'CLOSED' }),
      ])
    ).toBe('CLOSED');
  });
});
