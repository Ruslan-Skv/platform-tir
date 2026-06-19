import { Injectable, NotFoundException } from '@nestjs/common';
import { PageStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export type KnowledgeMaterialLikeStats = {
  likeCount: number;
  likedByMe: boolean;
};

@Injectable()
export class KnowledgeMaterialLikesService {
  constructor(private prisma: PrismaService) {}

  async attachLikeStats<T extends { id: string }>(
    materials: T[],
    userId?: string,
  ): Promise<Array<T & KnowledgeMaterialLikeStats>> {
    if (materials.length === 0) {
      return [];
    }

    const materialIds = materials.map((material) => material.id);

    const countRows = await this.prisma.knowledgeMaterialLike.groupBy({
      by: ['materialId'],
      where: { materialId: { in: materialIds } },
      _count: { _all: true },
    });
    const countByMaterial = new Map(countRows.map((row) => [row.materialId, row._count._all]));

    let likedMaterialIds = new Set<string>();
    if (userId) {
      const myLikes = await this.prisma.knowledgeMaterialLike.findMany({
        where: { materialId: { in: materialIds }, userId },
        select: { materialId: true },
      });
      likedMaterialIds = new Set(myLikes.map((like) => like.materialId));
    }

    return materials.map((material) => ({
      ...material,
      likeCount: countByMaterial.get(material.id) ?? 0,
      likedByMe: likedMaterialIds.has(material.id),
    }));
  }

  async toggleLike(
    materialId: string,
    userId: string,
  ): Promise<KnowledgeMaterialLikeStats & { liked: boolean }> {
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

    const existing = await this.prisma.knowledgeMaterialLike.findUnique({
      where: {
        materialId_userId: { materialId, userId },
      },
    });

    if (existing) {
      await this.prisma.knowledgeMaterialLike.delete({ where: { id: existing.id } });
      const likeCount = await this.getLikeCount(materialId);
      return { liked: false, likeCount, likedByMe: false };
    }

    await this.prisma.knowledgeMaterialLike.create({
      data: { materialId, userId },
    });
    const likeCount = await this.getLikeCount(materialId);
    return { liked: true, likeCount, likedByMe: true };
  }

  async getLikeCount(materialId: string): Promise<number> {
    return this.prisma.knowledgeMaterialLike.count({ where: { materialId } });
  }

  async getMaterialLikers(materialId: string) {
    const material = await this.prisma.knowledgeMaterial.findFirst({
      where: {
        id: materialId,
        deletedAt: null,
        category: { deletedAt: null },
      },
      select: { id: true },
    });
    if (!material) {
      throw new NotFoundException('Материал не найден');
    }

    const likes = await this.prisma.knowledgeMaterialLike.findMany({
      where: { materialId },
      orderBy: { createdAt: 'desc' },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return {
      users: likes.map((like) => like.user),
    };
  }
}
