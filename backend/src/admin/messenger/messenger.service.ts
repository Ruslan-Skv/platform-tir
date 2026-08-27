import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { MessengerConversationType, Prisma } from '@prisma/client';
import { ADMIN_ROLES } from '../../common/config/admin-roles.config';
import { PrismaService } from '../../database/prisma.service';
import {
  AddMessengerMembersDto,
  CreateChannelDto,
  CreateDirectConversationDto,
  SendMessengerMessageDto,
} from './dto/messenger.dto';
import { MessengerGateway } from './messenger.gateway';

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatar: true,
  role: true,
} satisfies Prisma.UserSelect;

const GENERAL_CHANNEL_TITLE = 'Общий';

@Injectable()
export class MessengerService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessengerGateway))
    private readonly gateway: MessengerGateway,
  ) {}

  async listUsers(currentUserId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isActive: true,
        role: { in: ADMIN_ROLES },
      },
      select: USER_SELECT,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { email: 'asc' }],
    });
    return users;
  }

  /** Обеспечивает канал «Общий» и членство текущего пользователя. */
  async ensureGeneralChannel(userId: string) {
    let general = await this.prisma.messengerConversation.findFirst({
      where: { type: MessengerConversationType.CHANNEL, isGeneral: true },
    });

    if (!general) {
      general = await this.prisma.messengerConversation.create({
        data: {
          type: MessengerConversationType.CHANNEL,
          title: GENERAL_CHANNEL_TITLE,
          isGeneral: true,
          createdById: userId,
        },
      });
    }

    const activeAdmins = await this.prisma.user.findMany({
      where: { isActive: true, role: { in: ADMIN_ROLES } },
      select: { id: true },
    });

    const existing = await this.prisma.messengerMember.findMany({
      where: { conversationId: general.id },
      select: { userId: true },
    });
    const existingSet = new Set(existing.map((m) => m.userId));
    const toAdd = activeAdmins.filter((u) => !existingSet.has(u.id));
    if (toAdd.length > 0) {
      await this.prisma.messengerMember.createMany({
        data: toAdd.map((u) => ({ conversationId: general.id, userId: u.id })),
        skipDuplicates: true,
      });
    }

    if (!existingSet.has(userId) && !toAdd.some((u) => u.id === userId)) {
      await this.prisma.messengerMember.create({
        data: { conversationId: general.id, userId },
      });
    }

    return general;
  }

  async listConversations(userId: string) {
    await this.ensureGeneralChannel(userId);

    const memberships = await this.prisma.messengerMember.findMany({
      where: {
        userId,
        conversation: {
          type: { in: [MessengerConversationType.DIRECT, MessengerConversationType.CHANNEL] },
        },
      },
      include: {
        conversation: {
          include: {
            members: {
              include: { user: { select: USER_SELECT } },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { author: { select: USER_SELECT } },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const items = await Promise.all(
      memberships.map(async (m) => {
        const lastMessage = m.conversation.messages[0] ?? null;
        const unreadCount = await this.prisma.messengerMessage.count({
          where: {
            conversationId: m.conversationId,
            deletedAt: null,
            authorId: { not: userId },
            ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
          },
        });

        return {
          id: m.conversation.id,
          type: m.conversation.type,
          title: this.resolveTitle(m.conversation, userId),
          isGeneral: m.conversation.isGeneral,
          kanbanCardId: m.conversation.kanbanCardId,
          createdAt: m.conversation.createdAt,
          updatedAt: m.conversation.updatedAt,
          lastReadAt: m.lastReadAt,
          unreadCount,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                body: lastMessage.body,
                createdAt: lastMessage.createdAt,
                authorId: lastMessage.authorId,
                author: lastMessage.author,
              }
            : null,
          members: m.conversation.members.map((mem) => ({
            id: mem.id,
            userId: mem.userId,
            joinedAt: mem.joinedAt,
            user: mem.user,
          })),
        };
      }),
    );

    items.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : new Date(a.updatedAt).getTime();
      const bTime = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

    return items;
  }

  async getConversation(userId: string, conversationId: string) {
    const membership = await this.requireMembership(userId, conversationId);
    const conversation = await this.prisma.messengerConversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: { user: { select: USER_SELECT } },
          orderBy: { joinedAt: 'asc' },
        },
        kanbanCard: { select: { id: true, title: true } },
      },
    });
    if (!conversation) {
      throw new NotFoundException('Чат не найден');
    }

    return {
      id: conversation.id,
      type: conversation.type,
      title: this.resolveTitle(conversation, userId),
      isGeneral: conversation.isGeneral,
      kanbanCardId: conversation.kanbanCardId,
      kanbanCard: conversation.kanbanCard,
      createdById: conversation.createdById,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastReadAt: membership.lastReadAt,
      members: conversation.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        joinedAt: m.joinedAt,
        lastReadAt: m.lastReadAt,
        user: m.user,
      })),
    };
  }

  async createDirect(userId: string, dto: CreateDirectConversationDto) {
    if (dto.userId === userId) {
      throw new BadRequestException('Нельзя создать чат с собой');
    }

    const peer = await this.prisma.user.findFirst({
      where: { id: dto.userId, isActive: true, role: { in: ADMIN_ROLES } },
      select: { id: true },
    });
    if (!peer) {
      throw new NotFoundException('Пользователь не найден');
    }

    const existing = await this.findDirectBetween(userId, peer.id);
    if (existing) {
      return this.getConversation(userId, existing.id);
    }

    const conversation = await this.prisma.messengerConversation.create({
      data: {
        type: MessengerConversationType.DIRECT,
        createdById: userId,
        members: {
          create: [{ userId }, { userId: peer.id }],
        },
      },
    });

    return this.getConversation(userId, conversation.id);
  }

  async createChannel(userId: string, dto: CreateChannelDto) {
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Укажите название канала');
    }

    const memberIds = Array.from(new Set([userId, ...(dto.memberIds ?? [])]));
    const validMembers = await this.prisma.user.findMany({
      where: { id: { in: memberIds }, isActive: true, role: { in: ADMIN_ROLES } },
      select: { id: true },
    });
    const validIds = new Set(validMembers.map((u) => u.id));
    if (!validIds.has(userId)) {
      throw new ForbiddenException('Нет доступа');
    }

    const conversation = await this.prisma.messengerConversation.create({
      data: {
        type: MessengerConversationType.CHANNEL,
        title,
        isGeneral: false,
        createdById: userId,
        members: {
          create: [...validIds].map((id) => ({ userId: id })),
        },
      },
    });

    const result = await this.getConversation(userId, conversation.id);
    this.gateway.emitConversationUpdated(conversation.id, { conversation: result });
    return result;
  }

  async listMessages(
    userId: string,
    conversationId: string,
    opts?: { cursor?: string; limit?: number },
  ) {
    await this.requireMembership(userId, conversationId);
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);

    const messages = await this.prisma.messengerMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(opts?.cursor ? { createdAt: { lt: await this.cursorCreatedAt(opts.cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { author: { select: USER_SELECT } },
    });

    return {
      items: messages.reverse().map((m) => this.mapMessage(m)),
      nextCursor: messages.length === limit ? messages[0]?.id : null,
    };
  }

  async sendMessage(userId: string, conversationId: string, dto: SendMessengerMessageDto) {
    await this.requireMembership(userId, conversationId);
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Сообщение не может быть пустым');
    }

    const message = await this.prisma.messengerMessage.create({
      data: {
        conversationId,
        authorId: userId,
        body,
      },
      include: { author: { select: USER_SELECT } },
    });

    await this.prisma.messengerConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    await this.prisma.messengerMember.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });

    const mapped = this.mapMessage(message);
    this.gateway.emitMessageNew(conversationId, mapped);
    this.gateway.emitConversationUpdated(conversationId, {
      conversationId,
      lastMessage: mapped,
    });
    return mapped;
  }

  async markRead(userId: string, conversationId: string) {
    await this.requireMembership(userId, conversationId);
    await this.prisma.messengerMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  async addMembers(userId: string, conversationId: string, dto: AddMessengerMembersDto) {
    const conversation = await this.prisma.messengerConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Чат не найден');
    }
    if (conversation.type !== MessengerConversationType.CHANNEL) {
      throw new BadRequestException('Участников можно добавлять только в каналы');
    }
    await this.requireMembership(userId, conversationId);

    const validMembers = await this.prisma.user.findMany({
      where: {
        id: { in: dto.memberIds },
        isActive: true,
        role: { in: ADMIN_ROLES },
      },
      select: { id: true },
    });

    if (validMembers.length === 0) {
      throw new BadRequestException('Нет подходящих пользователей');
    }

    await this.prisma.messengerMember.createMany({
      data: validMembers.map((u) => ({ conversationId, userId: u.id })),
      skipDuplicates: true,
    });

    const result = await this.getConversation(userId, conversationId);
    this.gateway.emitConversationUpdated(conversationId, { conversation: result });
    return result;
  }

  async getOrCreateKanbanThread(userId: string, cardId: string) {
    const card = await this.prisma.kanbanCard.findUnique({
      where: { id: cardId },
      select: { id: true, title: true, assigneeId: true, createdById: true },
    });
    if (!card) {
      throw new NotFoundException('Карточка не найдена');
    }

    let conversation = await this.prisma.messengerConversation.findUnique({
      where: { kanbanCardId: cardId },
    });

    if (!conversation) {
      const memberIds = Array.from(
        new Set([userId, card.createdById, ...(card.assigneeId ? [card.assigneeId] : [])]),
      );
      conversation = await this.prisma.messengerConversation.create({
        data: {
          type: MessengerConversationType.KANBAN_CARD,
          title: card.title,
          kanbanCardId: cardId,
          createdById: userId,
          members: {
            create: memberIds.map((id) => ({ userId: id })),
          },
        },
      });
    } else {
      await this.prisma.messengerMember.createMany({
        data: [{ conversationId: conversation.id, userId }],
        skipDuplicates: true,
      });
    }

    return this.getConversation(userId, conversation.id);
  }

  async assertMembership(userId: string, conversationId: string) {
    await this.requireMembership(userId, conversationId);
  }

  private async requireMembership(userId: string, conversationId: string) {
    const membership = await this.prisma.messengerMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Нет доступа к чату');
    }
    return membership;
  }

  private async findDirectBetween(userA: string, userB: string) {
    const [idA, idB] = userA < userB ? [userA, userB] : [userB, userA];
    const candidates = await this.prisma.messengerConversation.findMany({
      where: {
        type: MessengerConversationType.DIRECT,
        AND: [{ members: { some: { userId: idA } } }, { members: { some: { userId: idB } } }],
      },
      include: {
        members: { select: { userId: true } },
      },
    });

    return (
      candidates.find((c) => {
        const ids = c.members.map((m) => m.userId).sort();
        return ids.length === 2 && ids[0] === idA && ids[1] === idB;
      }) ?? null
    );
  }

  private resolveTitle(
    conversation: {
      type: MessengerConversationType;
      title: string | null;
      isGeneral: boolean;
      members?: Array<{
        userId: string;
        user?: { firstName: string | null; lastName: string | null; email: string };
      }>;
    },
    currentUserId: string,
  ) {
    if (conversation.type === MessengerConversationType.CHANNEL) {
      return conversation.title || (conversation.isGeneral ? GENERAL_CHANNEL_TITLE : 'Канал');
    }
    if (conversation.type === MessengerConversationType.KANBAN_CARD) {
      return conversation.title || 'Чат задачи';
    }
    const peer = conversation.members?.find((m) => m.userId !== currentUserId)?.user;
    if (!peer) return 'Личный чат';
    const name = `${peer.firstName || ''} ${peer.lastName || ''}`.trim();
    return name || peer.email;
  }

  private mapMessage(message: {
    id: string;
    conversationId: string;
    authorId: string;
    body: string;
    createdAt: Date;
    deletedAt: Date | null;
    author: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      avatar: string | null;
      role: string;
    };
  }) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      authorId: message.authorId,
      body: message.body,
      createdAt: message.createdAt,
      deletedAt: message.deletedAt,
      author: message.author,
    };
  }

  private async cursorCreatedAt(messageId: string) {
    const msg = await this.prisma.messengerMessage.findUnique({
      where: { id: messageId },
      select: { createdAt: true },
    });
    if (!msg) {
      throw new BadRequestException('Некорректный cursor');
    }
    return msg.createdAt;
  }
}
