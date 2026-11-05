import { PACKAGE_NOT_IN_TRASH } from '../contract-document-packages/shared/package-not-in-trash';
import { AdminBellFurnitureScheduleFeedService } from './admin-bell-furniture-schedule-feed.service';
import { AdminBellRepairScheduleFeedService } from './admin-bell-repair-schedule-feed.service';

type FindManyArgs = { where?: unknown };

function makePrisma(list: FindManyArgs[], rows: unknown[] = []) {
  return {
    repairScheduleBellEvent: {
      findMany: jest.fn(async (args: FindManyArgs) => {
        list.push(args);
        return rows;
      }),
    },
  };
}

describe('AdminBellRepairScheduleFeedService.listForUser', () => {
  it('не показывает события проектов из корзины план-графика и удалённых договоров', async () => {
    const queries: FindManyArgs[] = [];
    const service = new AdminBellRepairScheduleFeedService(makePrisma(queries) as never);

    await service.listForUser('user1');

    expect(queries[0]?.where).toEqual(
      expect.objectContaining({
        recipientId: 'user1',
        project: {
          deletedAt: null,
          ...PACKAGE_NOT_IN_TRASH,
        },
      }),
    );
  });
});

describe('AdminBellFurnitureScheduleFeedService.listForUser', () => {
  it('не показывает события проектов удалённых договоров', async () => {
    const queries: FindManyArgs[] = [];
    const service = new AdminBellFurnitureScheduleFeedService({
      furnitureScheduleBellEvent: {
        findMany: jest.fn(async (args: FindManyArgs) => {
          queries.push(args);
          return [];
        }),
      },
    } as never);

    await service.listForUser('user1');

    expect(queries[0]?.where).toEqual(
      expect.objectContaining({
        recipientId: 'user1',
        project: {
          ...PACKAGE_NOT_IN_TRASH,
        },
      }),
    );
  });
});
