import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { QUIZ_SUBMISSION_STATUSES } from '../../quiz/quiz.types';
import { ReplaceQuizStepsDto } from './dto/replace-quiz-steps.dto';
import { UpdateQuizLandingDto } from './dto/update-quiz-landing.dto';
import { UpdateQuizSubmissionDto } from './dto/update-quiz-submission.dto';

@Injectable()
export class AdminQuizService {
  constructor(private readonly prisma: PrismaService) {}

  async getLanding(slug: string) {
    const quiz = await this.prisma.quizLanding.findUnique({
      where: { slug },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!quiz) {
      throw new NotFoundException('Квиз не найден');
    }
    return quiz;
  }

  async updateLanding(slug: string, dto: UpdateQuizLandingDto) {
    const existing = await this.prisma.quizLanding.findUnique({ where: { slug } });
    if (!existing) {
      throw new NotFoundException('Квиз не найден');
    }

    const data: Prisma.QuizLandingUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.domain !== undefined) data.domain = dto.domain?.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.headline !== undefined) data.headline = dto.headline?.trim() || null;
    if (dto.subheadline !== undefined) data.subheadline = dto.subheadline?.trim() || null;
    if (dto.promoText !== undefined) data.promoText = dto.promoText?.trim() || null;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.primaryColor !== undefined) data.primaryColor = dto.primaryColor;
    if (dto.theme !== undefined) {
      const current =
        existing.theme && typeof existing.theme === 'object' && !Array.isArray(existing.theme)
          ? (existing.theme as Record<string, unknown>)
          : {};
      const accentColor =
        dto.primaryColor ?? dto.theme.accentColor ?? (current.accentColor as string | undefined);
      data.theme = {
        ...current,
        ...dto.theme,
        ...(accentColor !== undefined && { accentColor }),
      } as unknown as Prisma.InputJsonValue;
    } else if (dto.primaryColor !== undefined && existing.theme) {
      const current =
        typeof existing.theme === 'object' && !Array.isArray(existing.theme)
          ? (existing.theme as Record<string, unknown>)
          : {};
      data.theme = {
        ...current,
        accentColor: dto.primaryColor,
      } as unknown as Prisma.InputJsonValue;
    }
    if (dto.displayPhone !== undefined) data.displayPhone = dto.displayPhone?.trim() || null;
    if (dto.city !== undefined) data.city = dto.city?.trim() || null;
    if (dto.successTitle !== undefined) data.successTitle = dto.successTitle?.trim() || null;
    if (dto.successText !== undefined) data.successText = dto.successText?.trim() || null;
    if (dto.catalogFileUrl !== undefined) data.catalogFileUrl = dto.catalogFileUrl?.trim() || null;
    if (dto.privacyPolicyUrl !== undefined)
      data.privacyPolicyUrl = dto.privacyPolicyUrl?.trim() || null;
    if (dto.notifyEmails !== undefined) {
      data.notifyEmails = dto.notifyEmails.map((e) => e.trim()).filter(Boolean);
    }
    if (dto.notifyTelegramIds !== undefined) {
      data.notifyTelegramIds = dto.notifyTelegramIds.map((e) => e.trim()).filter(Boolean);
    }
    if (dto.notifyPhones !== undefined) {
      data.notifyPhones = dto.notifyPhones.map((e) => e.trim()).filter(Boolean);
    }

    return this.prisma.quizLanding.update({
      where: { slug },
      data,
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async replaceSteps(slug: string, dto: ReplaceQuizStepsDto) {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { slug } });
    if (!quiz) {
      throw new NotFoundException('Квиз не найден');
    }

    const keys = dto.steps.map((s) => s.key);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Ключи шагов должны быть уникальными');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.quizStep.deleteMany({ where: { quizId: quiz.id } });
      if (dto.steps.length > 0) {
        await tx.quizStep.createMany({
          data: dto.steps.map((step) => ({
            quizId: quiz.id,
            key: step.key,
            sortOrder: step.sortOrder,
            type: step.type,
            title: step.title,
            subtitle: step.subtitle?.trim() || null,
            placeholder: step.placeholder?.trim() || null,
            required: step.required ?? true,
            options: step.options?.length
              ? (step.options as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            showWhen: step.showWhen
              ? (step.showWhen as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          })),
        });
      }
    });

    return this.getLanding(slug);
  }

  async findSubmissions(
    slug: string,
    page: number,
    limit: number,
    filters?: { status?: string; furnitureType?: string; search?: string },
  ) {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { slug } });
    if (!quiz) {
      throw new NotFoundException('Квиз не найден');
    }

    const where: Prisma.QuizSubmissionWhereInput = { quizId: quiz.id };
    if (
      filters?.status &&
      QUIZ_SUBMISSION_STATUSES.includes(filters.status as (typeof QUIZ_SUBMISSION_STATUSES)[number])
    ) {
      where.status = filters.status;
    }
    if (filters?.furnitureType) {
      where.furnitureType = filters.furnitureType;
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total, statusCounts] = await Promise.all([
      this.prisma.quizSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quizSubmission.count({ where }),
      this.prisma.quizSubmission.groupBy({
        by: ['status'],
        where: { quizId: quiz.id },
        _count: { _all: true },
      }),
    ]);

    const stats: Record<string, number> = { total: 0 };
    for (const row of statusCounts) {
      stats[row.status] = row._count._all;
      stats.total += row._count._all;
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  }

  async updateSubmission(slug: string, submissionId: string, dto: UpdateQuizSubmissionDto) {
    const quiz = await this.prisma.quizLanding.findUnique({ where: { slug } });
    if (!quiz) {
      throw new NotFoundException('Квиз не найден');
    }

    const existing = await this.prisma.quizSubmission.findFirst({
      where: { id: submissionId, quizId: quiz.id },
    });
    if (!existing) {
      throw new NotFoundException('Заявка не найдена');
    }

    if (
      dto.status &&
      !QUIZ_SUBMISSION_STATUSES.includes(dto.status as (typeof QUIZ_SUBMISSION_STATUSES)[number])
    ) {
      throw new BadRequestException('Некорректный статус');
    }

    return this.prisma.quizSubmission.update({
      where: { id: submissionId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.managerNote !== undefined && { managerNote: dto.managerNote?.trim() || null }),
      },
    });
  }
}
