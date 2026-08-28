import { Injectable } from '@nestjs/common';
import { AdminBellPushService } from '../../bell-push/admin-bell-push.service';
import { PrismaService } from '../../database/prisma.service';

export type KanbanCardNotifyKind = 'assigned' | 'moved' | 'commented' | 'due_changed' | 'priority';

@Injectable()
export class KanbanNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminBellPush: AdminBellPushService,
  ) {}

  async notifyCardEvent(params: {
    actorId: string;
    cardId: string;
    boardId: string;
    kind: KanbanCardNotifyKind;
    title: string;
    message: string;
    recipientIds: string[];
  }) {
    const recipientIds = [
      ...new Set(params.recipientIds.filter((id) => Boolean(id) && id !== params.actorId)),
    ];
    if (recipientIds.length === 0) return;

    const href = `/admin/kanban?board=${params.boardId}&card=${params.cardId}`;
    await this.prisma.kanbanCardBellEvent.createMany({
      data: recipientIds.map((recipientId) => ({
        recipientId,
        cardId: params.cardId,
        kind: params.kind,
        title: params.title,
        message: params.message,
        href,
      })),
    });

    await Promise.all(
      recipientIds.map((recipientId) =>
        this.adminBellPush.notifyUsers([recipientId], 'kanban_card', {
          title: params.title,
          body: params.message,
          url: href,
          tag: `kanban-${params.kind}-${params.cardId}-${recipientId}`,
        }),
      ),
    );
  }
}
