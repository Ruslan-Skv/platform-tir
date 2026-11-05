import { PACKAGE_NOT_IN_TRASH } from '../contract-document-packages/shared/package-not-in-trash';
import { JointObjectsService } from './joint-objects.service';

type FindManyArgs = { where?: unknown };

function makeService() {
  const queries = {
    installationScheduleEntry: [] as FindManyArgs[],
    repairScheduleProject: [] as FindManyArgs[],
    furnitureScheduleProject: [] as FindManyArgs[],
    waybillTask: [] as FindManyArgs[],
  };
  const prisma = Object.fromEntries(
    Object.entries(queries).map(([model, list]) => [
      model,
      {
        findMany: jest.fn(async (args: FindManyArgs) => {
          list.push(args);
          return [];
        }),
      },
    ]),
  );
  const service = new JointObjectsService(prisma as never);
  return { service, queries };
}

describe('JointObjectsService.list', () => {
  it('не показывает удалённые проекты и записи удалённых договоров', async () => {
    const { service, queries } = makeService();

    const result = await service.list({});

    expect(result.objects).toEqual([]);
    expect(queries.repairScheduleProject[0]?.where).toEqual({
      deletedAt: null,
      AND: [PACKAGE_NOT_IN_TRASH],
      status: { not: 'CLOSED' },
    });
    expect(queries.furnitureScheduleProject[0]?.where).toEqual({
      AND: [PACKAGE_NOT_IN_TRASH],
      status: { not: 'CLOSED' },
    });
    expect(queries.installationScheduleEntry[0]?.where).toEqual(
      expect.objectContaining({ deletedAt: null, AND: [PACKAGE_NOT_IN_TRASH] }),
    );
  });

  it('с includeClosed фильтры корзины остаются, уходит только статус', async () => {
    const { service, queries } = makeService();

    await service.list({ includeClosed: true });

    expect(queries.repairScheduleProject[0]?.where).toEqual({
      deletedAt: null,
      AND: [PACKAGE_NOT_IN_TRASH],
    });
    expect(queries.furnitureScheduleProject[0]?.where).toEqual({
      AND: [PACKAGE_NOT_IN_TRASH],
    });
  });
});
