import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FURNITURE_QUIZ_SLUG, REMONT_QUIZ_SLUG } from '../../quiz/quiz.types';
import { UpdateLeadDto } from './dto/update-lead.dto';
import {
  LEAD_SOURCE_LABELS,
  type LeadSource,
  type LeadStatus,
  type UnifiedLeadItem,
  isLeadStatus,
  parseLeadId,
} from './lead.types';
import { AdminLeadsFeedbackService } from './services/admin-leads-feedback.service';
import { AdminLeadsFormService } from './services/admin-leads-form.service';
import { AdminLeadsOrderService } from './services/admin-leads-order.service';
import { AdminLeadsQuizService } from './services/admin-leads-quiz.service';

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
  constructor(
    private readonly formLeads: AdminLeadsFormService,
    private readonly quizLeads: AdminLeadsQuizService,
    private readonly orderLeads: AdminLeadsOrderService,
    private readonly feedbackLeads: AdminLeadsFeedbackService,
  ) {}

  resolveAllowedSources(userRole: string): LeadSource[] {
    const sources: LeadSource[] = [
      'form_measurement',
      'form_callback',
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

  resolveDirectorSources(): LeadSource[] {
    return ['form_director'];
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
    const sourceStatsEntries = await Promise.all(
      allowedSources.map(
        async (src) => [src, await this.countSourceLeads(src, { status, search })] as const,
      ),
    );
    const sourceStats = Object.fromEntries(sourceStatsEntries) as Record<LeadSource, number>;

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      statusStats,
      sources: allowedSources.map((s) => ({ id: s, label: LEAD_SOURCE_LABELS[s] })),
      sourceStats,
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
        return this.formLeads.updateLead(parsed.source, parsed.entityId, dto);
      case 'quiz_mebel':
        return this.quizLeads.updateLead(FURNITURE_QUIZ_SLUG, parsed.entityId, dto);
      case 'quiz_remont':
        return this.quizLeads.updateLead(REMONT_QUIZ_SLUG, parsed.entityId, dto);
      case 'order':
        return this.orderLeads.updateLead(parsed.entityId, dto);
      case 'site_feedback':
        return this.feedbackLeads.updateSiteLead(parsed.entityId, dto);
      case 'knowledge_feedback':
        return this.feedbackLeads.updateKnowledgeLead(parsed.entityId, dto);
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

  private async fetchSourceLeads(
    source: LeadSource,
    opts: { status?: LeadStatus; search?: string; take: number },
  ): Promise<UnifiedLeadItem[]> {
    switch (source) {
      case 'form_measurement':
      case 'form_callback':
      case 'form_director':
      case 'form_quote':
        return this.formLeads.fetchLeads(source, opts);
      case 'quiz_mebel':
        return this.quizLeads.fetchLeads(FURNITURE_QUIZ_SLUG, source, opts);
      case 'quiz_remont':
        return this.quizLeads.fetchLeads(REMONT_QUIZ_SLUG, source, opts);
      case 'order':
        return this.orderLeads.fetchLeads(opts);
      case 'site_feedback':
        return this.feedbackLeads.fetchSiteLeads(opts);
      case 'knowledge_feedback':
        return this.feedbackLeads.fetchKnowledgeLeads(opts);
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
        return this.formLeads.countLeads(source, opts);
      case 'quiz_mebel':
        return this.quizLeads.countLeads(FURNITURE_QUIZ_SLUG, opts);
      case 'quiz_remont':
        return this.quizLeads.countLeads(REMONT_QUIZ_SLUG, opts);
      case 'order':
        return this.orderLeads.countLeads(opts);
      case 'site_feedback':
        return this.feedbackLeads.countSiteLeads(opts);
      case 'knowledge_feedback':
        return this.feedbackLeads.countKnowledgeLeads(opts);
      default:
        return 0;
    }
  }

  private async fetchLeadById(
    source: LeadSource,
    entityId: string,
  ): Promise<UnifiedLeadItem | null> {
    switch (source) {
      case 'form_measurement':
      case 'form_callback':
      case 'form_director':
      case 'form_quote':
        return this.formLeads.fetchById(source, entityId);
      case 'quiz_mebel':
        return this.quizLeads.fetchById(FURNITURE_QUIZ_SLUG, source, entityId);
      case 'quiz_remont':
        return this.quizLeads.fetchById(REMONT_QUIZ_SLUG, source, entityId);
      case 'order':
        return this.orderLeads.fetchById(entityId);
      case 'site_feedback':
        return this.feedbackLeads.fetchSiteById(entityId);
      case 'knowledge_feedback':
        return this.feedbackLeads.fetchKnowledgeById(entityId);
      default:
        return null;
    }
  }
}
