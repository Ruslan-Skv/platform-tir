import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import {
  LEAD_SOURCE_LABELS,
  QUIZ_SLUG_TO_SOURCE,
  type LeadSource,
  type LeadStatus,
  type UnifiedLeadItem,
  buildLeadId,
  isLeadStatus,
} from '../lead.types';

@Injectable()
export class AdminLeadsQuizService {
  constructor(private readonly prisma: PrismaService) {}

  async fetchLeads(
    slug: string,
    source: LeadSource,
    opts: { status?: LeadStatus; search?: string; take: number },
  ): Promise<UnifiedLeadItem[]> {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { slug } });
    if (!quiz) return [];

    const rows = await this.prisma.quizSubmission.findMany({
      where: this.quizWhere(quiz.id, opts),
      orderBy: { createdAt: 'desc' },
      take: opts.take,
    });

    return rows.map((row) => this.mapQuizSubmission(row, source, slug));
  }

  async countLeads(slug: string, opts: { status?: LeadStatus; search?: string }): Promise<number> {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { slug } });
    if (!quiz) return 0;
    return this.prisma.quizSubmission.count({ where: this.quizWhere(quiz.id, opts) });
  }

  async fetchById(
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

  async updateLead(slug: string, entityId: string, dto: UpdateLeadDto): Promise<UnifiedLeadItem> {
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

  async deleteLead(slug: string, entityId: string): Promise<{ id: string }> {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { slug } });
    if (!quiz) throw new NotFoundException('Квиз не найден');
    const source = QUIZ_SLUG_TO_SOURCE[slug];
    if (!source) throw new NotFoundException('Заявка не найдена');
    const existing = await this.prisma.quizSubmission.findFirst({
      where: { id: entityId, quizId: quiz.id },
    });
    if (!existing) throw new NotFoundException('Заявка не найдена');
    await this.prisma.quizSubmission.delete({ where: { id: entityId } });
    return { id: buildLeadId(source, entityId) };
  }

  private quizWhere(
    quizId: string,
    opts: { status?: LeadStatus; search?: string },
  ): Prisma.QuizSubmissionWhereInput {
    const where: Prisma.QuizSubmissionWhereInput = { quizId };
    if (opts.status) where.status = opts.status;
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
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
}
