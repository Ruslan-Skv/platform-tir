import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ADMIN_ROLES } from '../admin-access/admin-access.service';

/** Без heartbeat дольше этого интервала пользователь считается офлайн. */
const STALE_MS = 90_000;

interface PresenceEntry {
  lastSeen: number;
}

/**
 * Онлайн-присутствие в админке (in-memory).
 * При нескольких инстансах backend без общего хранилища списки могут расходиться — для одного процесса / одного контейнера достаточно.
 */
@Injectable()
export class AdminPresenceService {
  private readonly presence = new Map<string, PresenceEntry>();

  constructor(private readonly prisma: PrismaService) {}

  heartbeat(userId: string): void {
    this.presence.set(userId, { lastSeen: Date.now() });
  }

  async getOnlineAdmins(): Promise<
    Array<{
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      role: UserRole;
      avatar: string | null;
    }>
  > {
    const now = Date.now();
    const activeUserIds = [...this.presence.entries()]
      .filter(([, v]) => now - v.lastSeen < STALE_MS)
      .map(([id]) => id);

    if (activeUserIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: activeUserIds },
        role: { in: ADMIN_ROLES },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
      },
    });

    const rank = (r: UserRole) => (r === 'SUPER_ADMIN' ? 0 : 1);
    return users.sort((a: (typeof users)[0], b: (typeof users)[0]) => {
      const rd = rank(a.role) - rank(b.role);
      if (rd !== 0) return rd;
      const an = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email;
      const bn = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email;
      return an.localeCompare(bn, 'ru');
    });
  }
}
