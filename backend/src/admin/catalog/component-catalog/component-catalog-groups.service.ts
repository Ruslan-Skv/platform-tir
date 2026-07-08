import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateComponentCatalogGroupDto } from './dto/create-component-catalog-group.dto';

@Injectable()
export class ComponentCatalogGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateComponentCatalogGroupDto) {
    const existing = await this.prisma.componentCatalogGroup.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Группа со slug "${dto.slug}" уже существует`);
    }

    const { catalogItemIds, ...data } = dto;
    return this.prisma.componentCatalogGroup.create({
      data: {
        ...data,
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
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { search, categoryId, isActive, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;
    const where: Prisma.ComponentCatalogGroupWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (categoryId) where.categoryId = categoryId;
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
    if (!row) throw new NotFoundException(`Группа ${id} не найдена`);
    return row;
  }

  async update(id: string, data: Partial<CreateComponentCatalogGroupDto>) {
    await this.findOne(id);
    if (data.slug) {
      const existing = await this.prisma.componentCatalogGroup.findFirst({
        where: { slug: data.slug, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Группа со slug "${data.slug}" уже существует`);
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

  private groupInclude() {
    return {
      category: { select: { id: true, name: true, slug: true } },
      items: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          catalogItem: {
            include: {
              _count: { select: { productComponents: true } },
            },
          },
        },
      },
      _count: { select: { items: true } },
    };
  }
}
