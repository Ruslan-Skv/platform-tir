import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export type AdminBellRemoteHelpNotification = {
  id: string;
  kind: 'request' | 'invite';
  kindLabel: string;
  sessionId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

/**
 * Колокольчик удалённой помощи (support-стиль — без отдельной таблицы событий):
 * суперадминам показываются запросы сотрудников (REQUESTED), сотруднику — его
 * ожидающие ответа приглашения (PENDING). Разрешённые сессии из фида исчезают сами.
 */
@Injectable()
export class AdminBellRemoteHelpFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(
    userId: string,
    role: UserRole | string,
    limit = 20,
  ): Promise<AdminBellRemoteHelpNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const sessions = await this.prisma.remoteHelpSession.findMany({
      where:
        role === 'SUPER_ADMIN'
          ? { status: 'REQUESTED', createdAt: { gte: since } }
          : { status: 'PENDING', userId, createdAt: { gte: since } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        admin: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return sessions.map((session) => {
      const isRequest = session.status === 'REQUESTED';
      const person = isRequest ? session.user : session.admin;
      const name =
        `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || person?.email || '';
      return {
        id: session.id,
        kind: (isRequest ? 'request' : 'invite') as 'request' | 'invite',
        kindLabel: 'Удалённая помощь',
        sessionId: session.id,
        title: isRequest ? 'Запрос удалённой помощи' : 'Запрос на подключение к экрану',
        message: isRequest
          ? `${name} просит помочь в работе с приложением`
          : `${name} просит доступ к вашему экрану`,
        href: isRequest ? '/admin/remote-help' : '/admin',
        occurredAt: session.createdAt.toISOString(),
      };
    });
  }
}
