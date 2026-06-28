import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FURNITURE_QUIZ_SLUG, REMONT_QUIZ_SLUG } from '../../quiz/quiz.types';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { leadStatusToOrderFilter, orderStatusToLeadStatus } from './lead-order-status.util';
import {
  FORM_TYPE_TO_SOURCE,
  LEAD_SOURCE_LABELS,
  QUIZ_SLUG_TO_SOURCE,
  type LeadSource,
  type LeadStatus,
  type UnifiedLeadItem,
  buildLeadId,
  isLeadStatus,
  parseLeadId,
} from './lead.types';

const FORM_SUBJECT_LABELS: Record<string, string> = {
  complaint: 'Жалоба',
  suggestion: 'Предложение',
  cooperation: 'Сотрудничество',
  question: 'Вопрос',
  other: 'Другое',
};

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  SUGGESTION: 'Предложение',
  BUG: 'Ошибка',
};

type ListParams = {
  page: number;
  limit: number;
  source?: LeadSource;
  status?: LeadStatus;
  search?: string;
  allowedSources: LeadSource[];
};

@Injectable()
export class AdminLeadsService {
  constructor(private readonly prisma: PrismaService) {}

  resolveAllowedSources(userRole: string): LeadSource[] {
    const sources: LeadSource[] = [
      'form_measurement',
      'form_callback',
      'form_director',
      'form_quote',
      'quiz_mebel',
      'quiz_remont',
      'order',
    ];
    if (userRole === 'SUPER_ADMIN') {
      sources.push('site_feedback', 'knowledge_feedback');
    }
    return sources;
  }

  async listLeads(params: ListParams) {
    const { page, limit, source, status, search, allowedSources } = params;
    const activeSources = this.pickSources(source, allowedSources);
    const takePerSource = Math.min(Math.max(page * limit, limit), 500);

    const chunks = await Promise.all(
      activeSources.map((src) =>
        this.fetchSourceLeads(src, { status, search, take: takePerSource }),
      ),
    );

    const counts = await Promise.all(
      activeSources.map((src) => this.countSourceLeads(src, { status, search })),
    );

    const merged = chunks
      .flat()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = counts.reduce((sum, n) => sum + n, 0);
    const skip = (page - 1) * limit;
    const data = merged.slice(skip, skip + limit);

    const statusStats = await this.collectStatusStats(activeSources, search);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      statusStats,
      sources: activeSources.map((s) => ({ id: s, label: LEAD_SOURCE_LABELS[s] })),
    };
  }

  async getLead(leadId: string, allowedSources: LeadSource[]): Promise<UnifiedLeadItem> {
    const parsed = parseLeadId(leadId);
    if (!parsed) throw new BadRequestException('Некорректный идентификатор заявки');
    if (!allowedSources.includes(parsed.source)) {
      throw new NotFoundException('Заявка не найдена');
    }
    const item = await this.fetchLeadById(parsed.source, parsed.entityId);
    if (!item) throw new NotFoundException('Заявка не найдена');
    return item;
  }

  async updateLead(leadId: string, dto: UpdateLeadDto, allowedSources: LeadSource[]) {
    const parsed = parseLeadId(leadId);
    if (!parsed) throw new BadRequestException('Некорректный идентификатор заявки');
    if (!allowedSources.includes(parsed.source)) {
      throw new NotFoundException('Заявка не найдена');
    }
    if (dto.status && !isLeadStatus(dto.status)) {
      throw new BadRequestException('Некорректный статус');
    }

    switch (parsed.source) {
      case 'form_measurement':
      case 'form_callback':
      case 'form_director':
      case 'form_quote':
        return this.updateFormLead(parsed.source, parsed.entityId, dto);
      case 'quiz_mebel':
        return this.updateQuizLead(FURNITURE_QUIZ_SLUG, parsed.entityId, dto);
      case 'quiz_remont':
        return this.updateQuizLead(REMONT_QUIZ_SLUG, parsed.entityId, dto);
      case 'order':
        return this.updateOrderLead(parsed.entityId, dto);
      case 'site_feedback':
        return this.updateSiteFeedbackLead(parsed.entityId, dto);
      case 'knowledge_feedback':
        return this.updateKnowledgeFeedbackLead(parsed.entityId, dto);
      default:
        throw new NotFoundException('Заявка не найдена');
    }
  }

  private pickSources(source: LeadSource | undefined, allowed: LeadSource[]): LeadSource[] {
    if (source) {
      if (!allowed.includes(source)) return [];
      return [source];
    }
    return allowed;
  }

  private async collectStatusStats(sources: LeadSource[], search?: string) {
    const stats: Record<string, number> = { total: 0 };
    for (const status of [
      'new',
      'contacted',
      'in_progress',
      'completed',
      'cancelled',
    ] as LeadStatus[]) {
      const count = (
        await Promise.all(sources.map((src) => this.countSourceLeads(src, { status, search })))
      ).reduce((a, b) => a + b, 0);
      stats[status] = count;
      stats.total += count;
    }
    return stats;
  }

  private formTypeFromSource(source: LeadSource): string {
    const entry = Object.entries(FORM_TYPE_TO_SOURCE).find(([, s]) => s === source);
    return entry?.[0] ?? '';
  }

  private async fetchSourceLeads(
    source: LeadSource,
    opts: { status?: LeadStatus; search?: string; take: number },
  ): Promise<UnifiedLeadItem[]> {
    switch (source) {
      case 'form_measurement':
      case 'form_callback':
      case 'form_director':
      case 'form_quote':
        return this.fetchFormLeads(source, opts);
      case 'quiz_mebel':
        return this.fetchQuizLeads(FURNITURE_QUIZ_SLUG, source, opts);
      case 'quiz_remont':
        return this.fetchQuizLeads(REMONT_QUIZ_SLUG, source, opts);
      case 'order':
        return this.fetchOrderLeads(opts);
      case 'site_feedback':
        return this.fetchSiteFeedbackLeads(opts);
      case 'knowledge_feedback':
        return this.fetchKnowledgeFeedbackLeads(opts);
      default:
        return [];
    }
  }

  private async countSourceLeads(
    source: LeadSource,
    opts: { status?: LeadStatus; search?: string },
  ): Promise<number> {
    switch (source) {
      case 'form_measurement':
      case 'form_callback':
      case 'form_director':
      case 'form_quote':
        return this.prisma.formSubmission.count({ where: this.formWhere(source, opts) });
      case 'quiz_mebel':
        return this.countQuizLeads(FURNITURE_QUIZ_SLUG, opts);
      case 'quiz_remont':
        return this.countQuizLeads(REMONT_QUIZ_SLUG, opts);
      case 'order':
        return this.countOrderLeads(opts);
      case 'site_feedback':
        return this.prisma.sitePlatformFeedback.count({ where: this.siteFeedbackWhere(opts) });
      case 'knowledge_feedback':
        return this.prisma.knowledgePlatformFeedback.count({
          where: this.knowledgeFeedbackWhere(opts),
        });
      default:
        return 0;
    }
  }

  private formWhere(
    source: LeadSource,
    opts: { status?: LeadStatus; search?: string },
  ): Prisma.FormSubmissionWhereInput {
    const where: Prisma.FormSubmissionWhereInput = {
      type: this.formTypeFromSource(source),
    };
    if (opts.status) where.status = opts.status;
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { comment: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
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

  private async fetchFormLeads(
    source: LeadSource,
    opts: { status?: LeadStatus; search?: string; take: number },
  ): Promise<UnifiedLeadItem[]> {
    const rows = await this.prisma.formSubmission.findMany({
      where: this.formWhere(source, opts),
      orderBy: { createdAt: 'desc' },
      take: opts.take,
    });
    return rows.map((row) => this.mapFormSubmission(row, source));
  }

  private mapFormSubmission(
    row: {
      id: string;
      type: string;
      name: string;
      phone: string;
      email: string | null;
      address: string | null;
      preferredDate: string | null;
      preferredTime: string;
      productType: string | null;
      subject: string | null;
      comment: string | null;
      status: string;
      managerNote: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    source: LeadSource,
  ): UnifiedLeadItem {
    const previewParts: string[] = [];
    if (row.type === 'director' && row.subject) {
      previewParts.push(FORM_SUBJECT_LABELS[row.subject] ?? row.subject);
    }
    if (row.address) previewParts.push(`Адрес: ${row.address}`);
    if (row.preferredDate) previewParts.push(`Дата: ${row.preferredDate}`);
    if (row.preferredTime) previewParts.push(`Время: ${row.preferredTime}`);
    if (row.productType) previewParts.push(`Тип: ${row.productType}`);
    if (row.comment) previewParts.push(row.comment);

    return {
      id: buildLeadId(source, row.id),
      source,
      sourceLabel: LEAD_SOURCE_LABELS[source],
      status: isLeadStatus(row.status) ? row.status : 'new',
      statusEditable: true,
      name: row.name,
      phone: row.phone || null,
      email: row.email,
      preview: previewParts.join(' · ') || '—',
      managerNote: row.managerNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      detailUrl: null,
      payload: {
        type: row.type,
        address: row.address,
        preferredDate: row.preferredDate,
        preferredTime: row.preferredTime,
        productType: row.productType,
        subject: row.subject,
        comment: row.comment,
      },
    };
  }

  private async fetchQuizLeads(
    slug: string,
    source: LeadSource,
    opts: { status?: LeadStatus; search?: string; take: number },
  ): Promise<UnifiedLeadItem[]> {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { slug } });
    if (!quiz) return [];

    const where: Prisma.QuizSubmissionWhereInput = { quizId: quiz.id };
    if (opts.status) where.status = opts.status;
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.quizSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.take,
    });

    return rows.map((row) => this.mapQuizSubmission(row, source, slug));
  }

  private async countQuizLeads(
    slug: string,
    opts: { status?: LeadStatus; search?: string },
  ): Promise<number> {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { slug } });
    if (!quiz) return 0;

    const where: Prisma.QuizSubmissionWhereInput = { quizId: quiz.id };
    if (opts.status) where.status = opts.status;
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.quizSubmission.count({ where });
  }

  private mapQuizSubmission(
    row: {
      id: string;
      name: string;
      phone: string;
      answers: Prisma.JsonValue;
      furnitureType: string | null;
      status: string;
      managerNote: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    source: LeadSource,
    slug: string,
  ): UnifiedLeadItem {
    const answers =
      row.answers && typeof row.answers === 'object' && !Array.isArray(row.answers)
        ? (row.answers as Record<string, string>)
        : {};
    const answerPreview = Object.values(answers).filter(Boolean).slice(0, 3).join(' · ');

    return {
      id: buildLeadId(source, row.id),
      source,
      sourceLabel: LEAD_SOURCE_LABELS[source],
      status: isLeadStatus(row.status) ? row.status : 'new',
      statusEditable: true,
      name: row.name,
      phone: row.phone,
      email: null,
      preview: answerPreview || row.furnitureType || '—',
      managerNote: row.managerNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      detailUrl: `/admin/quiz/${slug}`,
      payload: {
        furnitureType: row.furnitureType,
        answers,
      },
    };
  }

  private async fetchOrderLeads(opts: {
    status?: LeadStatus;
    search?: string;
    take: number;
  }): Promise<UnifiedLeadItem[]> {
    const where = this.orderWhere(opts);
    const rows = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.take,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        customerFirstName: true,
        customerLastName: true,
        customerPhone: true,
        customerEmail: true,
        adminNotes: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
    });
    return rows.map((row) => this.mapOrder(row));
  }

  private async countOrderLeads(opts: { status?: LeadStatus; search?: string }): Promise<number> {
    return this.prisma.order.count({ where: this.orderWhere(opts) });
  }

  private orderWhere(opts: { status?: LeadStatus; search?: string }): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (opts.status) {
      const statuses = leadStatusToOrderFilter(opts.status);
      if (statuses.length > 0) where.status = { in: statuses };
      else where.status = OrderStatus.PENDING;
    }
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { customerFirstName: { contains: q, mode: 'insensitive' } },
        { customerLastName: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  private mapOrder(row: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    total: Prisma.Decimal;
    customerFirstName: string | null;
    customerLastName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    adminNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
      phone: string | null;
    };
  }): UnifiedLeadItem {
    const name =
      [row.customerFirstName, row.customerLastName].filter(Boolean).join(' ').trim() ||
      [row.user.firstName, row.user.lastName].filter(Boolean).join(' ').trim() ||
      'Покупатель';

    return {
      id: buildLeadId('order', row.id),
      source: 'order',
      sourceLabel: LEAD_SOURCE_LABELS.order,
      status: orderStatusToLeadStatus(row.status),
      statusEditable: false,
      name,
      phone: row.customerPhone || row.user.phone,
      email: row.customerEmail || row.user.email,
      preview: `Заказ ${row.orderNumber} · ${row.total.toString()} ₽`,
      managerNote: row.adminNotes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      detailUrl: `/admin/orders/${row.id}`,
      payload: {
        orderNumber: row.orderNumber,
        orderStatus: row.status,
        total: row.total.toString(),
      },
    };
  }

  private async fetchSiteFeedbackLeads(opts: {
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

  private async fetchKnowledgeFeedbackLeads(opts: {
    status?: LeadStatus;
    search?: string;
    take: number;
  }): Promise<UnifiedLeadItem[]> {
    const where = this.knowledgeFeedbackWhere(opts);

    const rows = await this.prisma.knowledgePlatformFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.take,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    return rows.map((row) => this.mapKnowledgeFeedback(row));
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

  private async fetchLeadById(
    source: LeadSource,
    entityId: string,
  ): Promise<UnifiedLeadItem | null> {
    switch (source) {
      case 'form_measurement':
      case 'form_callback':
      case 'form_director':
      case 'form_quote': {
        const row = await this.prisma.formSubmission.findFirst({
          where: { id: entityId, type: this.formTypeFromSource(source) },
        });
        return row ? this.mapFormSubmission(row, source) : null;
      }
      case 'quiz_mebel':
        return this.fetchQuizLeadById(FURNITURE_QUIZ_SLUG, source, entityId);
      case 'quiz_remont':
        return this.fetchQuizLeadById(REMONT_QUIZ_SLUG, source, entityId);
      case 'order': {
        const row = await this.prisma.order.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            customerFirstName: true,
            customerLastName: true,
            customerPhone: true,
            customerEmail: true,
            adminNotes: true,
            createdAt: true,
            updatedAt: true,
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        });
        return row ? this.mapOrder(row) : null;
      }
      case 'site_feedback': {
        const row = await this.prisma.sitePlatformFeedback.findUnique({
          where: { id: entityId },
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        });
        return row ? this.mapSiteFeedback(row) : null;
      }
      case 'knowledge_feedback': {
        const row = await this.prisma.knowledgePlatformFeedback.findUnique({
          where: { id: entityId },
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        });
        return row ? this.mapKnowledgeFeedback(row) : null;
      }
      default:
        return null;
    }
  }

  private async fetchQuizLeadById(
    slug: string,
    source: LeadSource,
    entityId: string,
  ): Promise<UnifiedLeadItem | null> {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { slug } });
    if (!quiz) return null;
    const row = await this.prisma.quizSubmission.findFirst({
      where: { id: entityId, quizId: quiz.id },
    });
    return row ? this.mapQuizSubmission(row, source, slug) : null;
  }

  private async updateFormLead(source: LeadSource, entityId: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.formSubmission.findFirst({
      where: { id: entityId, type: this.formTypeFromSource(source) },
    });
    if (!existing) throw new NotFoundException('Заявка не найдена');

    const row = await this.prisma.formSubmission.update({
      where: { id: entityId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.managerNote !== undefined && { managerNote: dto.managerNote?.trim() || null }),
      },
    });
    return this.mapFormSubmission(row, source);
  }

  private async updateQuizLead(slug: string, entityId: string, dto: UpdateLeadDto) {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { slug } });
    if (!quiz) throw new NotFoundException('Квиз не найден');
    const existing = await this.prisma.quizSubmission.findFirst({
      where: { id: entityId, quizId: quiz.id },
    });
    if (!existing) throw new NotFoundException('Заявка не найдена');

    const row = await this.prisma.quizSubmission.update({
      where: { id: entityId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.managerNote !== undefined && { managerNote: dto.managerNote?.trim() || null }),
      },
    });
    const source = QUIZ_SLUG_TO_SOURCE[slug];
    if (!source) throw new NotFoundException('Заявка не найдена');
    return this.mapQuizSubmission(row, source, slug);
  }

  private async updateOrderLead(entityId: string, dto: UpdateLeadDto) {
    if (dto.status !== undefined) {
      throw new BadRequestException('Статус заказа меняется на странице заказа');
    }
    const existing = await this.prisma.order.findUnique({ where: { id: entityId } });
    if (!existing) throw new NotFoundException('Заявка не найдена');

    const row = await this.prisma.order.update({
      where: { id: entityId },
      data: {
        ...(dto.managerNote !== undefined && { adminNotes: dto.managerNote?.trim() || null }),
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        customerFirstName: true,
        customerLastName: true,
        customerPhone: true,
        customerEmail: true,
        adminNotes: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
    });
    return this.mapOrder(row);
  }

  private async updateSiteFeedbackLead(entityId: string, dto: UpdateLeadDto) {
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

  private async updateKnowledgeFeedbackLead(entityId: string, dto: UpdateLeadDto) {
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
