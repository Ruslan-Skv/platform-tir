import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { FEEDBACK_TYPE_LABELS } from '../admin-leads.constants';
import {
  LEAD_SOURCE_LABELS,
  type LeadStatus,
  type UnifiedLeadItem,
  buildLeadId,
  isLeadStatus,
} from '../lead.types';

@Injectable()
export class AdminLeadsFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async fetchSiteLeads(opts: {
    status?: LeadStatus;
    search?: string;
    take: number;
  }): Promise<UnifiedLeadItem[]> {
    const rows = await this.prisma.sitePlatformFeedback.findMany({
      where: this.siteFeedbackWhere(opts),
      orderBy: { createdAt: 'desc' },
      take: opts.take,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return rows.map((row) => this.mapSiteFeedback(row));
  }

  async countSiteLeads(opts: { status?: LeadStatus; search?: string }): Promise<number> {
    return this.prisma.sitePlatformFeedback.count({ where: this.siteFeedbackWhere(opts) });
  }

  async fetchSiteById(entityId: string): Promise<UnifiedLeadItem | null> {
    const row = await this.prisma.sitePlatformFeedback.findUnique({
      where: { id: entityId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return row ? this.mapSiteFeedback(row) : null;
  }

  async updateSiteLead(entityId: string, dto: UpdateLeadDto): Promise<UnifiedLeadItem> {
    const existing = await this.prisma.sitePlatformFeedback.findUnique({ where: { id: entityId } });
    if (!existing) throw new NotFoundException('Заявка не найдена');

    const readAt = this.resolveFeedbackReadAt(dto.status, existing.readAt);
    const row = await this.prisma.sitePlatformFeedback.update({
      where: { id: entityId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.managerNote !== undefined && { managerNote: dto.managerNote?.trim() || null }),
        ...(readAt !== undefined && { readAt }),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return this.mapSiteFeedback(row);
  }

  async fetchKnowledgeLeads(opts: {
    status?: LeadStatus;
    search?: string;
    take: number;
  }): Promise<UnifiedLeadItem[]> {
    const rows = await this.prisma.knowledgePlatformFeedback.findMany({
      where: this.knowledgeFeedbackWhere(opts),
      orderBy: { createdAt: 'desc' },
      take: opts.take,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return rows.map((row) => this.mapKnowledgeFeedback(row));
  }

  async countKnowledgeLeads(opts: { status?: LeadStatus; search?: string }): Promise<number> {
    return this.prisma.knowledgePlatformFeedback.count({
      where: this.knowledgeFeedbackWhere(opts),
    });
  }

  async fetchKnowledgeById(entityId: string): Promise<UnifiedLeadItem | null> {
    const row = await this.prisma.knowledgePlatformFeedback.findUnique({
      where: { id: entityId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return row ? this.mapKnowledgeFeedback(row) : null;
  }

  async updateKnowledgeLead(entityId: string, dto: UpdateLeadDto): Promise<UnifiedLeadItem> {
    const existing = await this.prisma.knowledgePlatformFeedback.findUnique({
      where: { id: entityId },
    });
    if (!existing) throw new NotFoundException('Заявка не найдена');

    const readAt = this.resolveFeedbackReadAt(dto.status, existing.readAt);
    const row = await this.prisma.knowledgePlatformFeedback.update({
      where: { id: entityId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.managerNote !== undefined && { managerNote: dto.managerNote?.trim() || null }),
        ...(readAt !== undefined && { readAt }),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return this.mapKnowledgeFeedback(row);
  }

  private siteFeedbackWhere(opts: {
    status?: LeadStatus;
    search?: string;
  }): Prisma.SitePlatformFeedbackWhereInput {
    const where: Prisma.SitePlatformFeedbackWhereInput = {};
    if (opts.status) where.status = opts.status;
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { text: { contains: q, mode: 'insensitive' } },
        { senderName: { contains: q, mode: 'insensitive' } },
        { senderEmail: { contains: q, mode: 'insensitive' } },
        { senderPhone: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private knowledgeFeedbackWhere(opts: {
    status?: LeadStatus;
    search?: string;
  }): Prisma.KnowledgePlatformFeedbackWhereInput {
    const where: Prisma.KnowledgePlatformFeedbackWhereInput = {};
    if (opts.status) where.status = opts.status;
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { text: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  private mapSiteFeedback(row: {
    id: string;
    type: string;
    text: string;
    pageUrl: string | null;
    senderName: string | null;
    senderEmail: string | null;
    senderPhone: string | null;
    status: string;
    managerNote: string | null;
    createdAt: Date;
    readAt: Date | null;
    user?: { firstName: string | null; lastName: string | null; email: string } | null;
  }): UnifiedLeadItem {
    const name =
      row.senderName?.trim() ||
      [row.user?.firstName, row.user?.lastName].filter(Boolean).join(' ').trim() ||
      'Посетитель сайта';

    return {
      id: buildLeadId('site_feedback', row.id),
      source: 'site_feedback',
      sourceLabel: LEAD_SOURCE_LABELS.site_feedback,
      status: isLeadStatus(row.status) ? row.status : row.readAt ? 'completed' : 'new',
      statusEditable: true,
      name,
      phone: row.senderPhone,
      email: row.senderEmail ?? row.user?.email ?? null,
      preview: `${FEEDBACK_TYPE_LABELS[row.type] ?? row.type}: ${row.text}`,
      managerNote: row.managerNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: (row.readAt ?? row.createdAt).toISOString(),
      detailUrl: '/admin/content/site-feedback',
      payload: { type: row.type, text: row.text, pageUrl: row.pageUrl },
    };
  }

  private mapKnowledgeFeedback(row: {
    id: string;
    type: string;
    text: string;
    status: string;
    managerNote: string | null;
    createdAt: Date;
    readAt: Date | null;
    user: { firstName: string | null; lastName: string | null; email: string };
  }): UnifiedLeadItem {
    const name =
      [row.user.firstName, row.user.lastName].filter(Boolean).join(' ').trim() ||
      row.user.email ||
      'Пользователь';

    return {
      id: buildLeadId('knowledge_feedback', row.id),
      source: 'knowledge_feedback',
      sourceLabel: LEAD_SOURCE_LABELS.knowledge_feedback,
      status: isLeadStatus(row.status) ? row.status : row.readAt ? 'completed' : 'new',
      statusEditable: true,
      name,
      phone: null,
      email: row.user.email,
      preview: `${FEEDBACK_TYPE_LABELS[row.type] ?? row.type}: ${row.text}`,
      managerNote: row.managerNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: (row.readAt ?? row.createdAt).toISOString(),
      detailUrl: '/admin/knowledge/feedback',
      payload: { type: row.type, text: row.text },
    };
  }

  private resolveFeedbackReadAt(
    status: string | undefined,
    currentReadAt: Date | null,
  ): Date | null | undefined {
    if (status === undefined) return undefined;
    if (status === 'completed' || status === 'cancelled') {
      return currentReadAt ?? new Date();
    }
    if (status === 'new') return null;
    return undefined;
  }
}
