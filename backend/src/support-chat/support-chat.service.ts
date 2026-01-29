import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConversationStatus } from '@prisma/client';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

const SUPPORT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT'];

@Injectable()
export class SupportChatService {
  constructor(private prisma: PrismaService) {}

  private isSupportRole(role: string): boolean {
    return SUPPORT_ROLES.includes(role);
  }

  async createConversation(userId: string) {
    return this.prisma.supportConversation.create({
      data: { userId, status: 'OPEN' },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        messages: { take: 0 },
      },
    });
  }

  async findMyConversations(userId: string) {
    return this.prisma.supportConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true },
        },
      },
    });
  }

  async findAllConversationsForSupport(userId: string, userRole: string, status?: string) {
    if (!this.isSupportRole(userRole)) {
      throw new ForbiddenException('Доступ только для сотрудников поддержки');
    }
    const where: { status?: ConversationStatus } = {};
    if (status && ['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(status)) {
      where.status = status as ConversationStatus;
    }
    return this.prisma.supportConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true },
        },
      },
    });
  }

  async findOne(conversationId: string, userId: string, userRole: string) {
    const conv = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!conv) throw new NotFoundException('Диалог не найден');
    const isOwner = conv.userId === userId;
    const isSupport = this.isSupportRole(userRole);
    if (!isOwner && !isSupport) {
      throw new ForbiddenException('Нет доступа к этому диалогу');
    }
    return conv;
  }

  async getMessages(conversationId: string, userId: string, userRole: string) {
    const conv = await this.findOne(conversationId, userId, userRole);
    return this.prisma.supportMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    userRole: string,
    dto: SendMessageDto,
  ) {
    const conv = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('Диалог не найден');
    const isOwner = conv.userId === senderId;
    const isSupport = this.isSupportRole(userRole);
    if (!isOwner && !isSupport) {
      throw new ForbiddenException('Нет доступа к этому диалогу');
    }
    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          conversationId,
          senderId,
          content: dto.content,
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
        },
      }),
      this.prisma.supportConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return message;
  }

  async updateConversation(
    conversationId: string,
    userId: string,
    userRole: string,
    dto: UpdateConversationDto,
  ) {
    if (!this.isSupportRole(userRole)) {
      throw new ForbiddenException('Только сотрудники поддержки могут изменять диалог');
    }
    const conv = await this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('Диалог не найден');
    return this.prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        ...(dto.status != null && { status: dto.status }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId || null }),
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
