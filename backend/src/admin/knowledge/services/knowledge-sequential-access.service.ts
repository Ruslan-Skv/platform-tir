import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PageStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  isKnowledgeMaterialStudyCompleted,
  type KnowledgeMaterialCompletionInput,
} from './knowledge-material-completion.util';
import { sortKnowledgeMaterialIdsForList } from '../knowledge-material-list-order';
import { KnowledgeQuizService } from '../knowledge-quiz.service';
import { KnowledgeTrainingNotifyService } from './knowledge-training-notify.service';

type CategoryMaterialRow = {
  id: string;
  type: string;
  status: PageStatus;
  sortOrder: number;
  isPinned: boolean;
  createdAt: Date;
  publishedAt: Date | null;
  module: { order: number } | null;
};

@Injectable()
export class KnowledgeSequentialAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledgeQuizService: KnowledgeQuizService,
    private readonly knowledgeTrainingNotify: KnowledgeTrainingNotifyService,
  ) {}

  async getCategoryPublishedMaterialIds(categoryId: string): Promise<string[]> {
    const rows = await this.prisma.knowledgeMaterial.findMany({
      where: {
        categoryId,
        deletedAt: null,
        status: PageStatus.PUBLISHED,
        category: { deletedAt: null },
        AND: [{ OR: [{ moduleId: null }, { module: { deletedAt: null } }] }],
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

    return sortKnowledgeMaterialIdsForList(rows as CategoryMaterialRow[], 'category');
  }

  private async loadCompletionByMaterialId(
    userId: string,
    materialsMeta: Array<{ id: string; type: string }>,
  ): Promise<Map<string, boolean>> {
    if (materialsMeta.length === 0) {
      return new Map();
    }

    const materialIds = materialsMeta.map((material) => material.id);
    const [studyRows, videoRows, quizStatusMap] = await Promise.all([
      this.prisma.knowledgeMaterialStudyCompletion.findMany({
        where: { userId, materialId: { in: materialIds } },
        select: { materialId: true },
      }),
      this.prisma.knowledgeVideoProgress.findMany({
        where: { userId, materialId: { in: materialIds } },
        select: { materialId: true, completed: true },
      }),
      this.knowledgeQuizService.getUserQuizStatusForMaterials(materialIds, userId),
    ]);

    const studyCompletedIds = new Set(
      studyRows.map((row: { materialId: string }) => row.materialId),
    );
    const videoByMaterial = new Map(
      videoRows.map((row: { materialId: string; completed: boolean }) => [row.materialId, row]),
    );

    const result = new Map<string, boolean>();
    for (const material of materialsMeta) {
      const quizStatus = quizStatusMap[material.id] ?? {
        hasQuiz: false,
        passed: false,
        scorePercent: null,
      };
      result.set(
        material.id,
        isKnowledgeMaterialStudyCompleted({
          type: material.type,
          myQuizStatus: quizStatus,
          myVideoProgress: videoByMaterial.get(material.id) ?? null,
          studyCompleted: studyCompletedIds.has(material.id),
        }),
      );
    }

    return result;
  }

  async getUnlockedMaterialIds(categoryId: string, userId: string): Promise<Set<string>> {
    const orderedIds = await this.getCategoryPublishedMaterialIds(categoryId);
    if (orderedIds.length === 0) {
      return new Set();
    }

    const materialsMeta = await this.prisma.knowledgeMaterial.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true, type: true },
    });
    const completionById = await this.loadCompletionByMaterialId(userId, materialsMeta);

    const unlocked = new Set<string>();
    for (let index = 0; index < orderedIds.length; index += 1) {
      const materialId = orderedIds[index];
      if (index === 0) {
        unlocked.add(materialId);
        continue;
      }

      const previousCompleted = orderedIds
        .slice(0, index)
        .every((id) => completionById.get(id) === true);
      if (previousCompleted) {
        unlocked.add(materialId);
      }
    }

    return unlocked;
  }

  async assertMaterialUnlockedForParticipant(
    materialId: string,
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const unlocked = await this.getUnlockedMaterialIds(categoryId, userId);
    if (!unlocked.has(materialId)) {
      throw new ForbiddenException(
        'Материал пока недоступен. Сначала завершите изучение предыдущего материала в категории.',
      );
    }
  }

  async assertMaterialStudyCompletedForParticipant(
    materialId: string,
    userId: string,
  ): Promise<void> {
    const material = await this.prisma.knowledgeMaterial.findFirst({
      where: {
        id: materialId,
        deletedAt: null,
        status: PageStatus.PUBLISHED,
        category: { deletedAt: null },
      },
      select: { id: true, type: true },
    });
    if (!material) {
      throw new NotFoundException('Материал не найден');
    }

    const completionById = await this.loadCompletionByMaterialId(userId, [material]);
    if (completionById.get(materialId) !== true) {
      throw new ForbiddenException(
        'Отметить материал как интересный можно только после его изучения.',
      );
    }
  }

  async attachSequentialAccess<T extends KnowledgeMaterialCompletionInput & { id: string }>(
    materials: T[],
    categoryId: string,
    userId: string,
  ): Promise<Array<T & { sequentialLocked: boolean; studyCompleted: boolean }>> {
    const orderedIds = await this.getCategoryPublishedMaterialIds(categoryId);
    const unlocked = await this.getUnlockedMaterialIds(categoryId, userId);

    return materials.map((material) => ({
      ...material,
      studyCompleted: isKnowledgeMaterialStudyCompleted(material),
      sequentialLocked: orderedIds.includes(material.id) && !unlocked.has(material.id),
    }));
  }

  async markStudyCompleted(materialId: string, userId: string) {
    const material = await this.prisma.knowledgeMaterial.findFirst({
      where: {
        id: materialId,
        deletedAt: null,
        status: PageStatus.PUBLISHED,
        category: { deletedAt: null },
      },
      select: { id: true, categoryId: true },
    });
    if (!material) {
      throw new NotFoundException('Материал не найден');
    }

    await this.assertMaterialUnlockedForParticipant(materialId, userId, material.categoryId);

    const existing = await this.prisma.knowledgeMaterialStudyCompletion.findUnique({
      where: { materialId_userId: { materialId, userId } },
    });

    await this.prisma.knowledgeMaterialStudyCompletion.upsert({
      where: {
        materialId_userId: { materialId, userId },
      },
      create: { materialId, userId },
      update: {},
    });

    if (!existing) {
      this.knowledgeTrainingNotify.notifyProgress('study_completed', userId, materialId);
    }

    return { studyCompleted: true };
  }

  async attachStudyCompletedFlags<T extends { id: string }>(
    materials: T[],
    userId?: string,
  ): Promise<Array<T & { studyCompleted: boolean }>> {
    if (!userId || materials.length === 0) {
      return materials.map((material) => ({ ...material, studyCompleted: false }));
    }

    const materialIds = materials.map((material) => material.id);
    const rows = await this.prisma.knowledgeMaterialStudyCompletion.findMany({
      where: { userId, materialId: { in: materialIds } },
      select: { materialId: true },
    });
    const completedIds = new Set(rows.map((row: { materialId: string }) => row.materialId));

    return materials.map((material) => ({
      ...material,
      studyCompleted: completedIds.has(material.id),
    }));
  }
}
