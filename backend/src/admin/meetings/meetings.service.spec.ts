import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MeetingsService } from './meetings.service';

const USER = (id: string) => ({
  id,
  email: `${id}@example.com`,
  firstName: id,
  lastName: null,
  role: 'MANAGER' as const,
  jobTitle: null,
  avatar: null,
});

function makeMeeting(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    title: 'Планёрка',
    description: null,
    scheduledAt: new Date('2026-11-17T10:00:00Z'),
    startedAt: null,
    endedAt: null,
    status: 'SCHEDULED',
    createdById: 'u1',
    createdAt: new Date('2026-11-16T10:00:00Z'),
    createdBy: USER('u1'),
    participants: [
      { meetingId: 'm1', userId: 'u1', joinedAt: null, leftAt: null, user: USER('u1') },
      { meetingId: 'm1', userId: 'u2', joinedAt: null, leftAt: null, user: USER('u2') },
    ],
    ...overrides,
  };
}

function makeService(
  overrides: {
    prisma?: Record<string, unknown>;
    gateway?: Record<string, unknown>;
  } = {},
) {
  const created: unknown[] = [];
  const bellEvents: unknown[] = [];
  const pushCalls: unknown[] = [];
  const meetingUpdates: unknown[] = [];

  const prisma = {
    meeting: {
      create: jest.fn(async (args: { data: { participants?: { create: unknown } } }) => {
        created.push(args.data.participants?.create);
        return makeMeeting();
      }),
      findUnique: jest.fn(async () => makeMeeting()),
      findUniqueOrThrow: jest.fn(async () => makeMeeting({ status: 'ACTIVE' })),
      findMany: jest.fn(async () => []),
      update: jest.fn(async (args: { data?: Record<string, unknown> }) => {
        meetingUpdates.push(args);
        return makeMeeting(args.data ?? {});
      }),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    meetingParticipant: {
      update: jest.fn(async () => ({})),
    },
    meetingBellEvent: {
      createMany: jest.fn(async (args: { data: unknown[] }) => {
        bellEvents.push(...args.data);
        return { count: args.data.length };
      }),
    },
    user: {
      // как настоящий Prisma: по одному ряду на каждый запрошенный id
      findMany: jest.fn(async (args: { where: { id: { in: string[] } } }) =>
        args.where.id.in.map((id) => ({ id })),
      ),
    },
    ...overrides.prisma,
  };

  const gateway = {
    roomSize: jest.fn(() => 0),
    isUserInRoom: jest.fn(() => false),
    emitMeetingEnded: jest.fn(),
    ...overrides.gateway,
  };

  const bellPush = {
    notifyUsers: jest.fn(async (userIds: string[]) => {
      pushCalls.push(userIds);
    }),
  };

  const service = new MeetingsService(prisma as never, bellPush as never, gateway as never);
  return { service, prisma, gateway, bellPush, created, bellEvents, pushCalls, meetingUpdates };
}

describe('MeetingsService.create', () => {
  it('отклоняет недоступных участников', async () => {
    const { service, prisma } = makeService();
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'u2' }]);

    await expect(
      service.create('u1', { title: 'Планёрка', participantIds: ['u2', 'u3'] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('создаёт собрание с автором-участником и уведомляет приглашённых', async () => {
    const { service, created, bellEvents, pushCalls } = makeService();

    const meeting = await service.create('u1', {
      title: 'Планёрка',
      scheduledAt: '2026-11-17T10:00:00.000Z',
      participantIds: ['u2', 'u3'],
    });

    expect(meeting.status).toBe('SCHEDULED');
    // автор + 2 приглашённых
    expect(created[0]).toEqual([{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }]);
    expect(bellEvents).toHaveLength(2);
    expect(pushCalls[0]).toEqual(['u2', 'u3']);
  });

  it('ограничивает состав лимитом участников', async () => {
    const { service } = makeService();
    const ids = Array.from({ length: 10 }, (_, i) => `u${i + 10}`);

    await expect(service.create('u1', { title: 'Планёрка', participantIds: ids })).rejects.toThrow(
      /Максимум/,
    );
  });
});

describe('MeetingsService.join', () => {
  it('первый вход переводит в ACTIVE и рассылает «началось» остальным', async () => {
    const { service, prisma, bellEvents } = makeService();
    (prisma.meeting.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await service.join('u1', 'm1');

    expect(result.meeting.status).toBe('ACTIVE');
    expect(prisma.meeting.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm1', status: 'SCHEDULED' },
        data: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
    expect(prisma.meetingParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { meetingId_userId: { meetingId: 'm1', userId: 'u1' } },
        data: expect.objectContaining({ leftAt: null }),
      }),
    );
    // u2 — единственный «остальной» участник
    expect(bellEvents.map((e: { userId: string }) => e.userId)).toEqual(['u2']);
  });

  it('отклоняет вход в заполненную комнату', async () => {
    const { service, gateway } = makeService({ gateway: { roomSize: jest.fn(() => 8) } });
    void gateway;

    await expect(service.join('u1', 'm1')).rejects.toThrow(/лимит/);
  });

  it('отклоняет вход завершённого собрания', async () => {
    const { service, prisma } = makeService();
    (prisma.meeting.findUnique as jest.Mock).mockResolvedValue(makeMeeting({ status: 'ENDED' }));

    await expect(service.join('u1', 'm1')).rejects.toThrow(/завершено/);
  });

  it('отклоняет чужака без записи участника', async () => {
    const { service, prisma } = makeService();
    (prisma.meeting.findUnique as jest.Mock).mockResolvedValue(
      makeMeeting({
        participants: [{ meetingId: 'm1', userId: 'u2', user: USER('u2') }],
      }),
    );

    await expect(service.join('u1', 'm1')).rejects.toThrow(ForbiddenException);
  });
});

describe('MeetingsService.markLeft', () => {
  it('завершает собрание, когда комнату покинул последний', async () => {
    const { service, prisma, gateway } = makeService({
      prisma: {
        meeting: {
          findUnique: jest.fn(async () => makeMeeting({ status: 'ACTIVE' })),
          update: jest.fn(async (args: { data?: Record<string, unknown> }) =>
            makeMeeting(args.data ?? {}),
          ),
        },
      },
    });

    await service.markLeft('u1', 'm1');

    expect(prisma.meetingParticipant.update).toHaveBeenCalled();
    expect(gateway.emitMeetingEnded).toHaveBeenCalledWith('m1', 'left');
    expect(prisma.meeting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ENDED' }),
      }),
    );
  });

  it('не завершает, пока в комнате есть другие', async () => {
    const update = jest.fn();
    const { service, gateway } = makeService({
      prisma: {
        meeting: {
          findUnique: jest.fn(async () => makeMeeting({ status: 'ACTIVE' })),
          update,
        },
      },
      gateway: { roomSize: jest.fn((_id: string, except?: string) => (except ? 2 : 3)) },
    });

    await service.markLeft('u1', 'm1');

    expect(gateway.emitMeetingEnded).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});

describe('MeetingsService.cancel', () => {
  it('разбирает комнату и уведомляет участников об отмене', async () => {
    const { service, gateway, bellEvents } = makeService();

    const meeting = await service.cancel('u1', 'm1');

    expect(meeting.status).toBe('CANCELLED');
    expect(gateway.emitMeetingEnded).toHaveBeenCalledWith('m1', 'cancelled');
    expect(bellEvents.map((e: { userId: string }) => e.userId)).toEqual(['u2']);
  });

  it('запрещает отмену не автору', async () => {
    const { service } = makeService();

    await expect(service.cancel('u2', 'm1')).rejects.toThrow(ForbiddenException);
  });
});
