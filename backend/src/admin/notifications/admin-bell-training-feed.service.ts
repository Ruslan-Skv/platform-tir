import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type KnowledgeTrainingBellKind = 'video_completed' | 'study_completed' | 'quiz_passed';

export type AdminBellTrainingNotification = {
  id: string;
  kind: KnowledgeTrainingBellKind;
  kindLabel: string;
  materialId: string;
  materialTitle: string;
  userId: string;
  userName: string;
  scorePercent: number | null;
  occurredAt: string;
};

const KIND_LABELS: Record<KnowledgeTrainingBellKind, string> = {
  video_completed: 'Видео изучено',
  study_completed: 'Материал изучен',
  quiz_passed: 'Тест пройден',
};

const USER_SELECT = {
  firstName: true,
  lastName: true,
  email: true,
} as const;

const MATERIAL_WHERE = {
  deletedAt: null,
  status: 'PUBLISHED' as const,
};

@Injectable()
export class AdminBellTrainingFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecent(limit = 20): Promise<AdminBellTrainingNotification[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);

    const [videos, studies, quizAttempts] = await Promise.all([
      this.prisma.knowledgeVideoProgress.findMany({
        where: {
          completed: true,
          updatedAt: { gte: since },
          material: MATERIAL_WHERE,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: {
          materialId: true,
          userId: true,
          updatedAt: true,
          material: { select: { title: true } },
          user: { select: USER_SELECT },
        },
      }),
      this.prisma.knowledgeMaterialStudyCompletion.findMany({
        where: {
          completedAt: { gte: since },
          material: MATERIAL_WHERE,
        },
        orderBy: { completedAt: 'desc' },
        take: limit,
        select: {
          materialId: true,
          userId: true,
          completedAt: true,
          material: { select: { title: true } },
          user: { select: USER_SELECT },
        },
      }),
      this.prisma.knowledgeQuizAttempt.findMany({
        where: {
          passed: true,
          createdAt: { gte: since },
          material: MATERIAL_WHERE,
        },
        orderBy: { createdAt: 'asc' },
        take: limit * 3,
        select: {
          id: true,
          materialId: true,
          userId: true,
          scorePercent: true,
          createdAt: true,
          material: { select: { title: true } },
          user: { select: USER_SELECT },
        },
      }),
    ]);

    const firstQuizPassByPair = new Map<string, (typeof quizAttempts)[number]>();
    for (const attempt of quizAttempts) {
      const pairKey = `${attempt.materialId}:${attempt.userId}`;
      if (!firstQuizPassByPair.has(pairKey)) {
        firstQuizPassByPair.set(pairKey, attempt);
      }
    }

    const items: AdminBellTrainingNotification[] = [
      ...videos.map((row) =>
        this.mapItem(
          'video_completed',
          row.materialId,
          row.userId,
          row.material.title,
          row.user,
          row.updatedAt,
          null,
        ),
      ),
      ...studies.map((row) =>
        this.mapItem(
          'study_completed',
          row.materialId,
          row.userId,
          row.material.title,
          row.user,
          row.completedAt,
          null,
        ),
      ),
      ...[...firstQuizPassByPair.values()].map((row) =>
        this.mapItem(
          'quiz_passed',
          row.materialId,
          row.userId,
          row.material.title,
          row.user,
          row.createdAt,
          row.scorePercent,
        ),
      ),
    ];

    return items
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, limit);
  }

  private mapItem(
    kind: KnowledgeTrainingBellKind,
    materialId: string,
    userId: string,
    materialTitle: string,
    user: { firstName: string | null; lastName: string | null; email: string },
    occurredAt: Date,
    scorePercent: number | null,
  ): AdminBellTrainingNotification {
    return {
      id: `${kind}:${materialId}:${userId}`,
      kind,
      kindLabel: KIND_LABELS[kind],
      materialId,
      materialTitle,
      userId,
      userName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email,
      scorePercent,
      occurredAt: occurredAt.toISOString(),
    };
  }
}
