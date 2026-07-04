import { Injectable } from '@nestjs/common';
import { KnowledgeMaterialType, PageStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { sortKnowledgeMaterialIdsForList } from '../knowledge-material-list-order';
import { isKnowledgeMaterialStudyCompleted } from './knowledge-material-completion.util';

export type KnowledgeTrainingCelebrationLevel = 'material' | 'module' | 'category';

export interface KnowledgeTrainingCelebration {
  level: KnowledgeTrainingCelebrationLevel;
  learnerName: string;
  materialTitle: string;
  moduleName: string | null;
  categoryName: string;
  moduleProgress: { completed: number; total: number } | null;
  categoryProgress: { completed: number; total: number };
  nextMaterialId: string | null;
}

type TrackableMaterialRow = {
  id: string;
  type: KnowledgeMaterialType;
  moduleId: string | null;
};

@Injectable()
export class KnowledgeTrainingCelebrationService {
  constructor(private readonly prisma: PrismaService) {}

  async buildForMaterialCompletion(
    userId: string,
    materialId: string,
  ): Promise<KnowledgeTrainingCelebration | null> {
    const material = await this.prisma.knowledgeMaterial.findFirst({
      where: {
        id: materialId,
        deletedAt: null,
        status: PageStatus.PUBLISHED,
        category: { deletedAt: null },
      },
      select: {
        id: true,
        title: true,
        type: true,
        moduleId: true,
        categoryId: true,
        category: { select: { name: true } },
        module: { select: { name: true } },
        quiz: { select: { _count: { select: { questions: true } } } },
      },
    });

    if (!material) {
      return null;
    }

    const hasQuiz = Boolean(material.quiz && material.quiz._count.questions > 0);
    const isCelebrationTrigger =
      material.type === KnowledgeMaterialType.VIDEO ||
      (material.type === KnowledgeMaterialType.ARTICLE && hasQuiz);

    if (!isCelebrationTrigger) {
      return null;
    }

    const [user, trackableInCategory, orderedIds, completionMap] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      }),
      this.loadTrackableMaterials(material.categoryId),
      this.getCategoryPublishedMaterialIds(material.categoryId),
      this.loadCompletionMap(userId, material.categoryId),
    ]);

    if (!user) {
      return null;
    }

    const learnerName = user.firstName?.trim() || 'Коллега';
    const categoryProgress = this.countProgress(trackableInCategory, completionMap);
    const categoryJustComplete =
      categoryProgress.total > 0 && categoryProgress.completed === categoryProgress.total;

    let moduleProgress: KnowledgeTrainingCelebration['moduleProgress'] = null;
    let moduleName: string | null = null;
    let moduleJustComplete = false;

    if (material.moduleId) {
      const trackableInModule = trackableInCategory.filter(
        (row) => row.moduleId === material.moduleId,
      );
      moduleProgress = this.countProgress(trackableInModule, completionMap);
      moduleName = material.module?.name?.trim() || null;
      moduleJustComplete =
        moduleProgress.total > 0 && moduleProgress.completed === moduleProgress.total;
    }

    const currentIndex = orderedIds.indexOf(materialId);
    const nextMaterialId =
      currentIndex >= 0 && currentIndex < orderedIds.length - 1
        ? orderedIds[currentIndex + 1]
        : null;

    const base: Omit<KnowledgeTrainingCelebration, 'level'> = {
      learnerName,
      materialTitle: material.title.trim(),
      moduleName,
      categoryName: material.category.name.trim(),
      moduleProgress,
      categoryProgress,
      nextMaterialId,
    };

    if (categoryJustComplete) {
      return { level: 'category', ...base };
    }

    if (moduleJustComplete && material.moduleId) {
      return { level: 'module', ...base };
    }

    return { level: 'material', ...base };
  }

  private async loadTrackableMaterials(categoryId: string): Promise<TrackableMaterialRow[]> {
    const rows = await this.prisma.knowledgeMaterial.findMany({
      where: {
        categoryId,
        deletedAt: null,
        status: PageStatus.PUBLISHED,
        category: { deletedAt: null },
        OR: [{ moduleId: null }, { module: { deletedAt: null } }],
        AND: [
          {
            OR: [{ type: KnowledgeMaterialType.VIDEO }, { quiz: { questions: { some: {} } } }],
          },
        ],
      },
      select: {
        id: true,
        type: true,
        moduleId: true,
      },
    });

    return rows;
  }

  private async getCategoryPublishedMaterialIds(categoryId: string): Promise<string[]> {
    const rows = await this.prisma.knowledgeMaterial.findMany({
      where: {
        categoryId,
        deletedAt: null,
        status: PageStatus.PUBLISHED,
        category: { deletedAt: null },
        OR: [{ moduleId: null }, { module: { deletedAt: null } }],
      },
      select: {
        id: true,
        type: true,
        status: true,
        sortOrder: true,
        isPinned: true,
        createdAt: true,
        publishedAt: true,
        module: { select: { order: true } },
      },
    });

    return sortKnowledgeMaterialIdsForList(rows, 'category');
  }

  private async loadCompletionMap(
    userId: string,
    categoryId: string,
  ): Promise<Map<string, boolean>> {
    const materials = await this.prisma.knowledgeMaterial.findMany({
      where: {
        categoryId,
        deletedAt: null,
        status: PageStatus.PUBLISHED,
        category: { deletedAt: null },
        OR: [{ moduleId: null }, { module: { deletedAt: null } }],
      },
      select: { id: true, type: true },
    });

    if (materials.length === 0) {
      return new Map();
    }

    const materialIds = materials.map((row) => row.id);
    const [studyRows, videoRows, quizRows, passedAttempts] = await Promise.all([
      this.prisma.knowledgeMaterialStudyCompletion.findMany({
        where: { userId, materialId: { in: materialIds } },
        select: { materialId: true },
      }),
      this.prisma.knowledgeVideoProgress.findMany({
        where: { userId, materialId: { in: materialIds } },
        select: { materialId: true, completed: true },
      }),
      this.prisma.knowledgeMaterialQuiz.findMany({
        where: { materialId: { in: materialIds }, questions: { some: {} } },
        select: { materialId: true },
      }),
      this.prisma.knowledgeQuizAttempt.findMany({
        where: { userId, materialId: { in: materialIds }, passed: true },
        select: { materialId: true },
      }),
    ]);

    const quizMaterialIds = new Set(quizRows.map((row) => row.materialId));
    const passedQuizIds = new Set(passedAttempts.map((row) => row.materialId));

    const studyCompletedIds = new Set(studyRows.map((row) => row.materialId));
    const videoByMaterial = new Map(
      videoRows.map((row) => [row.materialId, { completed: row.completed }]),
    );

    const result = new Map<string, boolean>();
    for (const material of materials) {
      result.set(
        material.id,
        isKnowledgeMaterialStudyCompleted({
          type: material.type,
          myQuizStatus: {
            hasQuiz: quizMaterialIds.has(material.id),
            passed: passedQuizIds.has(material.id),
          },
          myVideoProgress: videoByMaterial.get(material.id) ?? null,
          studyCompleted: studyCompletedIds.has(material.id),
        }),
      );
    }

    return result;
  }

  private countProgress(
    materials: TrackableMaterialRow[],
    completionMap: Map<string, boolean>,
  ): { completed: number; total: number } {
    const total = materials.length;
    const completed = materials.filter((material) => completionMap.get(material.id)).length;
    return { completed, total };
  }
}
