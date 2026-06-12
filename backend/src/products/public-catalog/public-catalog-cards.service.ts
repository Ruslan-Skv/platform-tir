import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PublicCatalogCardsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Карточки товаров для публичного каталога в заданном порядке id. */
  async getPublicCardsByIds(orderedIds: string[]) {
    if (orderedIds.length === 0) return [];
    return this.loadPublicCardsByIds(orderedIds);
  }

  async loadPublicCardsByIds(orderedIds: string[]) {
    const rows = await this.prisma.product.findMany({
      where: { id: { in: orderedIds }, isActive: true },
      include: this.catalogPublicListInclude(),
    });
    const map = new Map(rows.map((p) => [p.id, p]));
    const ordered = orderedIds
      .map((id) => map.get(id))
      .filter((p): p is (typeof rows)[number] => p != null);

    const agg = await this.prisma.review.groupBy({
      by: ['productId'],
      where: { productId: { in: orderedIds }, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    });
    const ratingMap = new Map(
      agg.map((a) => [
        a.productId,
        {
          rating: a._avg.rating ? Math.round(a._avg.rating * 10) / 10 : 0,
          reviewsCount: a._count.id,
        },
      ]),
    );

    return ordered.map((p) => {
      const r = ratingMap.get(p.id) ?? { rating: 0, reviewsCount: 0 };
      return { ...p, rating: r.rating, reviewsCount: r.reviewsCount };
    });
  }

  private catalogPublicListInclude(): Prisma.ProductInclude {
    return {
      category: {
        include: {
          parent: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
      manufacturer: { select: { id: true, name: true, slug: true } },
      coatingMaterial: { select: { id: true, name: true, slug: true } },
      canvasType: { select: { id: true, name: true, slug: true } },
      doorThickness: { select: { id: true, name: true, slug: true } },
      weatherstrip: { select: { id: true, name: true, slug: true } },
      partner: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          showLogoOnCards: true,
          tooltipText: true,
          showTooltip: true,
        },
      },
      cardVariants: { orderBy: { sortOrder: 'asc' as const } },
      cardBadgeSelections: {
        orderBy: { sortOrder: 'asc' as const },
        include: { badge: true },
      },
    };
  }
}
