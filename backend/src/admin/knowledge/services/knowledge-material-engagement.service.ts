import { Injectable, NotFoundException } from '@nestjs/common';
import { PageStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { KnowledgeMaterialFavoritesService } from './knowledge-material-favorites.service';
import { KnowledgeMaterialLikesService } from './knowledge-material-likes.service';
import { KnowledgeSequentialAccessService } from './knowledge-sequential-access.service';

@Injectable()
export class KnowledgeMaterialEngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly likesService: KnowledgeMaterialLikesService,
    private readonly favoritesService: KnowledgeMaterialFavoritesService,
    private readonly sequentialAccessService: KnowledgeSequentialAccessService,
  ) {}

  async toggleLike(
    materialId: string,
    userId: string,
    options?: { applySequentialLearning?: boolean },
  ) {
    if (options?.applySequentialLearning) {
      const existing = await this.prisma.knowledgeMaterialLike.findUnique({
        where: { materialId_userId: { materialId, userId } },
      });
      if (!existing) {
        await this.sequentialAccessService.assertMaterialStudyCompletedForParticipant(
          materialId,
          userId,
        );
      }
    }
    return this.likesService.toggleLike(materialId, userId);
  }

  async toggleFavorite(
    materialId: string,
    userId: string,
    options?: { applySequentialLearning?: boolean },
  ) {
    if (options?.applySequentialLearning) {
      const existing = await this.prisma.knowledgeMaterialFavorite.findUnique({
        where: { materialId_userId: { materialId, userId } },
      });
      if (!existing) {
        const material = await this.prisma.knowledgeMaterial.findFirst({
          where: {
            id: materialId,
            deletedAt: null,
            status: PageStatus.PUBLISHED,
            category: { deletedAt: null },
          },
          select: { categoryId: true },
        });
        if (!material) {
          throw new NotFoundException('Материал не найден');
        }
        await this.sequentialAccessService.assertMaterialUnlockedForParticipant(
          materialId,
          userId,
          material.categoryId,
        );
      }
    }
    return this.favoritesService.toggleFavorite(materialId, userId);
  }
}
