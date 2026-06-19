import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PageStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const COMMENT_AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatar: true,
} as const;

function mapComment(
  comment: {
    id: string;
    text: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      avatar: string | null;
    };
  },
  currentUserId?: string,
) {
  return {
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: comment.user,
    isMine: currentUserId ? comment.userId === currentUserId : false,
  };
}

@Injectable()
export class KnowledgeMaterialCommentsService {
  constructor(private prisma: PrismaService) {}

  async attachCommentCounts<T extends { id: string }>(
    materials: T[],
  ): Promise<Array<T & { commentCount: number }>> {
    if (materials.length === 0) return [];

    const materialIds = materials.map((material) => material.id);
    const countRows = await this.prisma.knowledgeMaterialComment.groupBy({
      by: ['materialId'],
      where: { materialId: { in: materialIds } },
      _count: { _all: true },
    });
    const countByMaterial = new Map(countRows.map((row) => [row.materialId, row._count._all]));

    return materials.map((material) => ({
      ...material,
      commentCount: countByMaterial.get(material.id) ?? 0,
    }));
  }

  private async assertPublishedMaterial(materialId: string) {
    const material = await this.prisma.knowledgeMaterial.findFirst({
      where: {
        id: materialId,
        deletedAt: null,
        status: PageStatus.PUBLISHED,
        category: { deletedAt: null },
      },
      select: { id: true },
    });
    if (!material) {
      throw new NotFoundException('Материал не найден');
    }
    return material;
  }

  async listComments(materialId: string, userId?: string) {
    await this.assertPublishedMaterial(materialId);

    const comments = await this.prisma.knowledgeMaterialComment.findMany({
      where: { materialId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        text: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: { select: COMMENT_AUTHOR_SELECT },
      },
    });

    return {
      comments: comments.map((comment) => mapComment(comment, userId)),
    };
  }

  async createComment(materialId: string, userId: string, text: string) {
    await this.assertPublishedMaterial(materialId);

    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('Комментарий не может быть пустым');
    }

    const comment = await this.prisma.knowledgeMaterialComment.create({
      data: {
        materialId,
        userId,
        text: trimmed,
      },
      select: {
        id: true,
        text: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: { select: COMMENT_AUTHOR_SELECT },
      },
    });

    const commentCount = await this.prisma.knowledgeMaterialComment.count({
      where: { materialId },
    });

    return {
      comment: mapComment(comment, userId),
      commentCount,
    };
  }
}
