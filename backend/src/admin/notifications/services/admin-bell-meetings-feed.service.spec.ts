import { AdminBellMeetingsFeedService } from './admin-bell-meetings-feed.service';

function makeService(overrides: { meetings?: unknown[]; events?: unknown[] } = {}) {
  const prisma = {
    meetingBellEvent: {
      findMany: jest.fn(async () => overrides.events ?? []),
    },
    meeting: {
      // как настоящий Prisma: фильтрует по окну scheduledAt из where
      findMany: jest.fn(async (args: { where: { scheduledAt?: { gte: Date; lte: Date } } }) =>
        (overrides.meetings ?? []).filter((row: { scheduledAt: Date }) => {
          const { gte, lte } = args.where.scheduledAt ?? {};
          const at = row.scheduledAt.getTime();
          return (!gte || at >= gte.getTime()) && (!lte || at <= lte.getTime());
        }),
      ),
    },
  };
  const service = new AdminBellMeetingsFeedService(prisma as never);
  return { service, prisma };
}

describe('AdminBellMeetingsFeedService.listForUser', () => {
  it('добавляет напоминание о собрании в окне ±15 минут', async () => {
    const { service } = makeService({
      meetings: [
        {
          id: 'm1',
          title: 'Планёрка',
          scheduledAt: new Date(Date.now() + 10 * 60_000),
          createdAt: new Date(),
        },
      ],
    });

    const items = await service.listForUser('u1');

    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('reminder');
    expect(items[0].href).toBe('/admin/meetings?join=m1');
  });

  it('не напоминает о далёких собраниях', async () => {
    const { service, prisma } = makeService({
      meetings: [
        {
          id: 'm2',
          title: 'Квартальная',
          scheduledAt: new Date(Date.now() + 3 * 60 * 60_000),
          createdAt: new Date(),
        },
      ],
    });

    const items = await service.listForUser('u1');

    expect(items).toHaveLength(0);
    // фильтр по участнику обязателен
    expect((prisma.meeting.findMany as jest.Mock).mock.calls[0][0].where.participants).toEqual({
      some: { userId: 'u1' },
    });
  });

  it('возвращает сохранённые события с метками видов', async () => {
    const { service } = makeService({
      events: [
        {
          id: 'e1',
          meetingId: 'm1',
          kind: 'started',
          title: 'Планёрка',
          message: 'Онлайн-собрание «Планёрка» началось',
          href: '/admin/meetings?join=m1',
          createdAt: new Date('2026-11-17T09:00:00Z'),
        },
      ],
    });

    const items = await service.listForUser('u1');

    expect(items[0].kind).toBe('started');
    expect(items[0].kindLabel).toBe('Собрание началось');
  });
});
