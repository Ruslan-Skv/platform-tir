import { PACKAGE_NOT_IN_TRASH } from '../contract-document-packages/shared/package-not-in-trash';
import { InstallationSchedulesService } from './installation-schedules.service';

type FindManyArgs = { where?: unknown };

function makeService() {
  const entryQueries: FindManyArgs[] = [];
  const prisma = {
    installationScheduleEntry: {
      findMany: jest.fn(async (args: FindManyArgs) => {
        entryQueries.push(args);
        return [];
      }),
    },
    installerMaster: {
      findMany: jest.fn().mockResolvedValue([{ id: 'installer1' }]),
    },
  };
  const service = new InstallationSchedulesService(prisma as never, {} as never, {} as never);
  return { service, entryQueries };
}

describe('InstallationSchedulesService.findByDateRange', () => {
  it('не показывает записи монтажей удалённых в корзину договоров', async () => {
    const { service, entryQueries } = makeService();

    await service.findByDateRange({});

    expect(entryQueries[0]?.where).toEqual(
      expect.objectContaining({ deletedAt: null, AND: [PACKAGE_NOT_IN_TRASH] }),
    );
  });
});

describe('InstallationSchedulesService.findMyByDateRange', () => {
  it('не показывает монтажнику записи удалённых договоров и сохраняет пересечение дат', async () => {
    const { service, entryQueries } = makeService();

    await service.findMyByDateRange('user1', {});

    expect(entryQueries[0]?.where).toEqual(
      expect.objectContaining({
        deletedAt: null,
        AND: [
          PACKAGE_NOT_IN_TRASH,
          {
            OR: [
              { installerId: { in: ['installer1'] } },
              { installerIds: { hasSome: ['installer1'] } },
            ],
          },
        ],
      }),
    );
  });
});
