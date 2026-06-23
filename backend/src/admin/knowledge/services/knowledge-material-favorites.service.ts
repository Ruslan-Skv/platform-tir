import { Injectable, NotFoundException } from '@nestjs/common';
import { PageStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export type KnowledgeMaterialFavoriteStats = {
  favoritedByMe: boolean;
};

@Injectable()
export class KnowledgeMaterialFavoritesService {
  constructor(private prisma: PrismaService) {}

  async attachFavoriteStats<T extends { id: string }>(
    materials: T[],
    userId?: string,
  ): Promise<Array<T & KnowledgeMaterialFavoriteStats>> {
    if (materials.length === 0 || !userId) {
      return materials.map((material) => ({ ...material, favoritedByMe: false }));
    }

    const materialIds = materials.map((material) => material.id);
    const myFavorites = await this.prisma.knowledgeMaterialFavorite.findMany({
      where: { materialId: { in: materialIds }, userId },
      select: { materialId: true },
    });
    const favoritedIds = new Set(myFavorites.map((row) => row.materialId));

    return materials.map((material) => ({
      ...material,
      favoritedByMe: favoritedIds.has(material.id),
    }));
  }

  async toggleFavorite(
    materialId: string,
    userId: string,
  ): Promise<KnowledgeMaterialFavoriteStats & { favorited: boolean }> {
    const material = await this.prisma.knowledgeMaterial.findFirst({
      where: {
        id: materialId,
        deletedAt: null,
        status: PageStatus.PUBLISHED,
        category: { deletedAt: null },
      },
    });
    if (!material) {
      throw new NotFoundException('Материал не найден');
    }

    const existing = await this.prisma.knowledgeMaterialFavorite.findUnique({
      where: {
        materialId_userId: { materialId, userId },
      },
    });

    if (existing) {
      await this.prisma.knowledgeMaterialFavorite.delete({ where: { id: existing.id } });
      return { favorited: false, favoritedByMe: false };
    }

    await this.prisma.knowledgeMaterialFavorite.create({
      data: { materialId, userId },
    });
    return { favorited: true, favoritedByMe: true };
  }

  async getUserFavoritesCount(userId: string): Promise<number> {
    return this.prisma.knowledgeMaterialFavorite.count({
      where: {
        userId,
        material: {
          deletedAt: null,
          status: PageStatus.PUBLISHED,
          category: { deletedAt: null },
        },
      },
    });
  }

  async listFavoriteMaterialIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.knowledgeMaterialFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { materialId: true },
    });
    return rows.map((row) => row.materialId);
  }
}
