import { PACKAGE_NOT_IN_TRASH } from '../contract-document-packages/shared/package-not-in-trash';
import { RepairSchedulesService } from './repair-schedules.service';

type FindManyArgs = { where?: unknown };

function makeService(rows: unknown[] = []) {
  const queries: FindManyArgs[] = [];
  const findMany = jest.fn(async (args: FindManyArgs) => {
    queries.push(args);
    return rows;
  });
  const rowEnrichment = {
    withContractInstallers: jest.fn((list: unknown[]) => list),
    withSalarySummaries: jest.fn(async (list: unknown[]) => list),
  };
  const service = new RepairSchedulesService(
    { repairScheduleProject: { findMany } } as never,
    {} as never,
    {} as never,
    rowEnrichment as never,
  );
  return { service, queries };
}

describe('RepairSchedulesService.findAll', () => {
  it('не показывает проекты договоров, удалённых в корзину пакетов документов', async () => {
    const { service, queries } = makeService();

    await service.findAll({});

    expect(queries[0]?.where).toEqual(
      expect.objectContaining({ deletedAt: null, AND: [PACKAGE_NOT_IN_TRASH] }),
    );
  });

  it('сочетает фильтр корзины пакета с поиском', async () => {
    const { service, queries } = makeService();

    await service.findAll({ search: 'Иванов' });

    expect(queries[0]?.where).toEqual(
      expect.objectContaining({
        deletedAt: null,
        AND: [PACKAGE_NOT_IN_TRASH],
        OR: expect.any(Array),
      }),
    );
    expect((queries[0]?.where as { OR: unknown[] }).OR).not.toHaveLength(0);
  });
});

describe('RepairSchedulesService.findMy', () => {
  it('не показывает монтажнику проекты договоров из корзины пакетов документов', async () => {
    const { service, queries } = makeService();

    await service.findMy('user1');

    expect(queries[0]?.where).toEqual(
      expect.objectContaining({
        deletedAt: null,
        installer: { userId: 'user1' },
        AND: [PACKAGE_NOT_IN_TRASH],
      }),
    );
  });
});
