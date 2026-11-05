import { PACKAGE_NOT_IN_TRASH } from '../contract-document-packages/shared/package-not-in-trash';
import { FurnitureSchedulesService } from './furniture-schedules.service';

type FindManyArgs = { where?: unknown };

function makeService(rows: unknown[] = []) {
  const queries: FindManyArgs[] = [];
  const findMany = jest.fn(async (args: FindManyArgs) => {
    queries.push(args);
    return rows;
  });
  const service = new FurnitureSchedulesService(
    { furnitureScheduleProject: { findMany } } as never,
    {} as never,
    {} as never,
  );
  return { service, queries };
}

describe('FurnitureSchedulesService.findAll', () => {
  it('не показывает проекты договоров, удалённых в корзину пакетов документов', async () => {
    const { service, queries } = makeService();

    await service.findAll({});

    expect(queries[0]?.where).toEqual(expect.objectContaining({ AND: [PACKAGE_NOT_IN_TRASH] }));
  });
});

describe('FurnitureSchedulesService.findMy', () => {
  it('не показывает монтажнику проекты договоров из корзины пакетов документов', async () => {
    const { service, queries } = makeService();

    await service.findMy('user1');

    expect(queries[0]?.where).toEqual(
      expect.objectContaining({
        installer: { userId: 'user1' },
        AND: [PACKAGE_NOT_IN_TRASH],
      }),
    );
  });
});
