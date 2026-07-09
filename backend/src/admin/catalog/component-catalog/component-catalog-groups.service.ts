import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateComponentCatalogGroupDto } from './dto/create-component-catalog-group.dto';
import { CopyComponentCatalogGroupDto } from './dto/copy-component-catalog-group.dto';
import {
  buildComponentCatalogItemSlug,
  slugifyComponentCatalog,
} from './utils/component-catalog-slug.util';

@Injectable()
export class ComponentCatalogGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateComponentCatalogGroupDto) {
    const { catalogItemIds, ...data } = dto;
    const slug = await this.ensureUniqueGroupSlugInSeries(
      dto.seriesId,
      dto.slug.trim() || slugifyComponentCatalog(dto.name),
    );

    return this.prisma.componentCatalogGroup.create({
      data: {
        ...data,
        slug,
        items: catalogItemIds?.length
          ? {
              create: catalogItemIds.map((catalogItemId, index) => ({
                catalogItemId,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: this.groupInclude(),
    });
  }

  async findAll(params?: {
    search?: string;
    categoryId?: string;
    seriesId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { search, categoryId, seriesId, isActive, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;
    const where: Prisma.ComponentCatalogGroupWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (categoryId) where.categoryId = categoryId;
    if (seriesId) where.seriesId = seriesId;
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { series: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.componentCatalogGroup.findMany({
        where,
        include: this.groupInclude(),
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.componentCatalogGroup.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const row = await this.prisma.componentCatalogGroup.findUnique({
      where: { id },
      include: this.groupInclude(),
    });
    if (!row) throw new NotFoundException(`Подгруппа ${id} не найдена`);
    return row;
  }

  async update(id: string, data: Partial<CreateComponentCatalogGroupDto>) {
    const current = await this.findOne(id);
    const seriesId = data.seriesId ?? current.seriesId;

    if (data.slug) {
      const slug = data.slug.trim();
      const existing = await this.prisma.componentCatalogGroup.findFirst({
        where: { seriesId, slug, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(
          `Подгруппа со slug "${slug}" уже существует в этой группе моделей`,
        );
      }
    }

    const { catalogItemIds, ...patch } = data;
    const updated = await this.prisma.componentCatalogGroup.update({
      where: { id },
      data: patch,
      include: this.groupInclude(),
    });

    if (catalogItemIds) {
      await this.setGroupItems(id, catalogItemIds);
      return this.findOne(id);
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.componentCatalogGroup.delete({ where: { id } });
  }

  async setGroupItems(groupId: string, catalogItemIds: string[]) {
    await this.findOne(groupId);
    await this.prisma.$transaction([
      this.prisma.componentCatalogGroupItem.deleteMany({ where: { groupId } }),
      ...catalogItemIds.map((catalogItemId, index) =>
        this.prisma.componentCatalogGroupItem.create({
          data: { groupId, catalogItemId, sortOrder: index },
        }),
      ),
    ]);
    return this.findOne(groupId);
  }

  async addGroupItem(groupId: string, catalogItemId: string) {
    await this.findOne(groupId);
    const item = await this.prisma.componentCatalogItem.findUnique({
      where: { id: catalogItemId },
    });
    if (!item) throw new NotFoundException(`Позиция ${catalogItemId} не найдена`);

    const maxSort = await this.prisma.componentCatalogGroupItem.aggregate({
      where: { groupId },
      _max: { sortOrder: true },
    });

    return this.prisma.componentCatalogGroupItem.upsert({
      where: { groupId_catalogItemId: { groupId, catalogItemId } },
      create: { groupId, catalogItemId, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 },
      update: {},
      include: { catalogItem: true },
    });
  }

  async removeGroupItem(groupId: string, catalogItemId: string) {
    await this.prisma.componentCatalogGroupItem.deleteMany({
      where: { groupId, catalogItemId },
    });
    return { success: true };
  }

  async getCatalogItemIdsForGroup(groupId: string): Promise<string[]> {
    const items = await this.prisma.componentCatalogGroupItem.findMany({
      where: { groupId },
      orderBy: { sortOrder: 'asc' },
      select: { catalogItemId: true },
    });
    return items.map((i: { catalogItemId: string }) => i.catalogItemId);
  }

  async copySubgroup(sourceGroupId: string, dto: CopyComponentCatalogGroupDto) {
    const source = await this.prisma.componentCatalogGroup.findUnique({
      where: { id: sourceGroupId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { catalogItem: true },
        },
      },
    });
    if (!source) throw new NotFoundException(`Подгруппа ${sourceGroupId} не найдена`);

    const subgroupSlug = await this.ensureUniqueGroupSlugInSeries(
      source.seriesId,
      dto.slug?.trim() || slugifyComponentCatalog(dto.name),
    );

    const newCatalogItemIds: string[] = [];
    for (const row of source.items) {
      const src = row.catalogItem;
      const color = dto.color.trim();
      const baseSlug = buildComponentCatalogItemSlug({
        name: src.name,
        size: src.size,
        color,
        material: src.material,
      });
      const itemSlug = await this.ensureUniqueItemSlug(baseSlug);

      let price = Number(src.price);
      if (dto.priceDelta !== undefined && dto.priceDelta !== 0) {
        price = Math.max(0, Math.round((price + dto.priceDelta) * 100) / 100);
      }

      const created = await this.prisma.componentCatalogItem.create({
        data: {
          kindId: src.kindId,
          name: src.name,
          size: src.size,
          color,
          material: src.material,
          price,
          slug: itemSlug,
          image: src.image,
          stock: src.stock,
          isActive: src.isActive,
          sortOrder: src.sortOrder,
        },
      });
      newCatalogItemIds.push(created.id);
    }

    return this.prisma.componentCatalogGroup.create({
      data: {
        seriesId: source.seriesId,
        name: dto.name.trim(),
        series: dto.variantNote?.trim() || source.series,
        categoryId: source.categoryId,
        slug: subgroupSlug,
        isActive: source.isActive,
        sortOrder: source.sortOrder,
        items: {
          create: newCatalogItemIds.map((catalogItemId, index) => ({
            catalogItemId,
            sortOrder: index,
          })),
        },
      },
      include: this.groupInclude(),
    });
  }

  private async ensureUniqueGroupSlugInSeries(seriesId: string, base: string): Promise<string> {
    const normalized = base.trim() || 'subgroup';
    let slug = normalized;
    let n = 1;
    while (
      await this.prisma.componentCatalogGroup.findFirst({
        where: { seriesId, slug },
      })
    ) {
      slug = `${normalized}-${n++}`;
    }
    return slug;
  }

  private async ensureUniqueItemSlug(base: string): Promise<string> {
    let slug = base;
    let n = 1;
    while (await this.prisma.componentCatalogItem.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    return slug;
  }

  private groupInclude() {
    return {
      seriesRef: { select: { id: true, name: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      items: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          catalogItem: {
            include: {
              kindRef: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
              _count: { select: { productComponents: true } },
            },
          },
        },
      },
      _count: { select: { items: true } },
    };
  }
}
