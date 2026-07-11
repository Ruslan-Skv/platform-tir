import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

const catalogItemInclude = {
  kindRef: {
    select: {
      id: true,
      code: true,
      name: true,
      kitQuantity: true,
      quantityStep: true,
    },
  },
  _count: {
    select: { productComponents: true },
  },
} as const;

@Injectable()
export class ComponentCatalogTreeService {
  constructor(private prisma: PrismaService) {}

  async findTree(params?: { search?: string; kindId?: string; isActive?: boolean }) {
    const { search, kindId, isActive } = params || {};
    const hasItemFilter = Boolean(search?.trim() || kindId || isActive !== undefined);

    const itemWhere = this.buildItemWhere({ search, kindId, isActive });

    const seriesRows = await this.prisma.componentCatalogSeries.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { subgroups: true } },
        subgroups: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            _count: { select: { items: true } },
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                catalogItem: {
                  include: catalogItemInclude,
                },
              },
            },
          },
        },
      },
    });

    const series = seriesRows
      .map((s) => {
        const subgroups = s.subgroups
          .map((g) => {
            const items = g.items
              .filter((row) => this.itemMatches(row.catalogItem, itemWhere))
              .map((row) => ({
                id: row.id,
                sortOrder: row.sortOrder,
                catalogItem: row.catalogItem,
              }));
            return {
              id: g.id,
              seriesId: g.seriesId,
              name: g.name,
              series: g.series,
              slug: g.slug,
              isActive: g.isActive,
              sortOrder: g.sortOrder,
              itemCount: g._count.items,
              items,
            };
          })
          .filter((g) => !hasItemFilter || g.items.length > 0);

        const itemCount = subgroups.reduce((sum, g) => sum + g.items.length, 0);
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          slug: s.slug,
          isActive: s.isActive,
          sortOrder: s.sortOrder,
          subgroupCount: s._count.subgroups,
          itemCount,
          subgroups,
        };
      })
      .filter((s) => !hasItemFilter || s.subgroups.length > 0);

    const ungroupedItems = await this.prisma.componentCatalogItem.findMany({
      where: {
        ...itemWhere,
        groupItems: { none: {} },
      },
      include: catalogItemInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return { series, ungroupedItems };
  }

  private buildItemWhere(params: {
    search?: string;
    kindId?: string;
    isActive?: boolean;
  }): Prisma.ComponentCatalogItemWhereInput {
    const where: Prisma.ComponentCatalogItemWhereInput = {};
    if (params.isActive !== undefined) where.isActive = params.isActive;
    if (params.kindId) where.kindId = params.kindId;
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { size: { contains: q, mode: 'insensitive' } },
        { color: { contains: q, mode: 'insensitive' } },
        { material: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private itemMatches(
    item: {
      kindId: string;
      name: string;
      size: string | null;
      color: string | null;
      material: string | null;
      slug: string;
      isActive: boolean;
    },
    where: Prisma.ComponentCatalogItemWhereInput,
  ): boolean {
    if (where.isActive !== undefined && item.isActive !== where.isActive) return false;
    if (where.kindId && typeof where.kindId === 'string' && item.kindId !== where.kindId) {
      return false;
    }
    if (where.OR && Array.isArray(where.OR)) {
      const q = this.extractSearchQuery(where.OR);
      if (q) {
        const hay = [item.name, item.size, item.color, item.material, item.slug]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
    }
    return true;
  }

  private extractSearchQuery(or: Prisma.ComponentCatalogItemWhereInput[]): string | null {
    for (const clause of or) {
      if (clause.name && typeof clause.name === 'object' && 'contains' in clause.name) {
        const c = clause.name.contains;
        if (typeof c === 'string') return c;
      }
    }
    return null;
  }
}
