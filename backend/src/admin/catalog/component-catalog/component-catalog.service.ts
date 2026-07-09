import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { ComponentCatalogKindsService } from '../../../products/services/component-catalog-kinds.service';
import { CreateComponentCatalogItemDto } from './dto/create-component-catalog-item.dto';
import { inferComponentKindCode } from '../../../products/utils/component-catalog-resolve.util';

const kindRefInclude = {
  kindRef: {
    select: {
      id: true,
      code: true,
      name: true,
      kitQuantity: true,
      quantityStep: true,
    },
  },
} as const;

@Injectable()
export class ComponentCatalogService {
  constructor(
    private prisma: PrismaService,
    private kindsService: ComponentCatalogKindsService,
  ) {}

  async create(dto: CreateComponentCatalogItemDto) {
    const kindId = await this.kindsService.resolveKindId(dto.kindId);
    const slug = dto.slug.trim();
    const normalized = this.normalizeCatalogItemFields(dto, kindId);

    const existing = await this.prisma.componentCatalogItem.findUnique({
      where: { slug },
      include: {
        ...this.usageCountInclude(),
        ...kindRefInclude,
      },
    });

    if (existing) {
      if (!this.isSameCatalogProduct(existing, normalized)) {
        throw new ConflictException(`Позиция со slug "${slug}" уже существует`);
      }
      return this.updateExistingCatalogItem(existing.id, dto);
    }

    return this.prisma.componentCatalogItem.create({
      data: {
        ...dto,
        slug,
        kindId,
      },
      include: {
        ...this.usageCountInclude(),
        ...kindRefInclude,
      },
    });
  }

  async findAll(params?: {
    search?: string;
    kindId?: string;
    groupId?: string;
    seriesId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      search,
      kindId,
      groupId,
      seriesId,
      isActive,
      page = 1,
      limit = 50,
      sortBy = 'sortOrder',
      sortOrder = 'asc',
    } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.ComponentCatalogItemWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (kindId) where.kindId = kindId;
    if (groupId) {
      where.groupItems = { some: { groupId } };
    }
    if (seriesId) {
      where.groupItems = { some: { group: { seriesId } } };
    }
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { size: { contains: q, mode: 'insensitive' } },
        { color: { contains: q, mode: 'insensitive' } },
        { material: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.componentCatalogItem.findMany({
        where,
        include: {
          ...this.usageCountInclude(),
          ...kindRefInclude,
          groupItems: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                  series: true,
                  seriesRef: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.componentCatalogItem.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.ComponentCatalogItemOrderByWithRelationInput[] {
    const dir = sortOrder;
    const allowed: Record<string, Prisma.ComponentCatalogItemOrderByWithRelationInput> = {
      name: { name: dir },
      kind: { kindRef: { name: dir } },
      size: { size: dir },
      color: { color: dir },
      material: { material: dir },
      price: { price: dir },
      sortOrder: { sortOrder: dir },
      updatedAt: { updatedAt: dir },
      createdAt: { createdAt: dir },
    };
    const primary = allowed[sortBy] ?? { sortOrder: dir };
    if (sortBy === 'sortOrder') return [primary, { name: 'asc' }];
    return [primary, { sortOrder: 'asc' }, { name: 'asc' }];
  }

  async findOne(id: string) {
    const row = await this.prisma.componentCatalogItem.findUnique({
      where: { id },
      include: {
        ...this.usageCountInclude(),
        ...kindRefInclude,
      },
    });
    if (!row) {
      throw new NotFoundException(`Позиция справочника ${id} не найдена`);
    }
    return row;
  }

  async update(id: string, data: Partial<CreateComponentCatalogItemDto>) {
    const row = await this.findOne(id);
    if (data.slug && data.slug !== row.slug) {
      const existing = await this.prisma.componentCatalogItem.findUnique({
        where: { slug: data.slug },
      });
      if (existing) {
        throw new ConflictException(`Позиция со slug "${data.slug}" уже существует`);
      }
    }

    const { kindId, ...rest } = data;
    const patch: Prisma.ComponentCatalogItemUncheckedUpdateInput = { ...rest };
    if (kindId) {
      patch.kindId = await this.kindsService.resolveKindId(kindId);
    }

    return this.prisma.componentCatalogItem.update({
      where: { id },
      data: patch,
      include: {
        ...this.usageCountInclude(),
        ...kindRefInclude,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.productComponent.updateMany({
      where: { catalogItemId: id },
      data: { catalogItemId: null },
    });
    return this.prisma.componentCatalogItem.delete({ where: { id } });
  }

  async reorder(items: { id: string; sortOrder: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.componentCatalogItem.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return { success: true };
  }

  /** Создать позицию справочника из legacy-полей ProductComponent */
  async findOrCreateFromLegacy(fields: {
    name: string;
    type: string;
    price: number;
    image?: string | null;
    stock?: number;
  }) {
    const code = inferComponentKindCode(fields.name, fields.type);
    const kindId = await this.kindsService.resolveKindIdByCode(code);
    const size = fields.type?.trim() || null;
    const slugBase = [fields.name, size].filter(Boolean).join('-');
    const slug = await this.ensureUniqueSlug(slugBase);

    const existing = await this.prisma.componentCatalogItem.findFirst({
      where: {
        name: { equals: fields.name, mode: 'insensitive' },
        size: size ? { equals: size, mode: 'insensitive' } : null,
        color: null,
        material: null,
      },
    });
    if (existing) return existing;

    return this.prisma.componentCatalogItem.create({
      data: {
        kindId,
        name: fields.name.trim(),
        size,
        price: fields.price,
        slug,
        image: fields.image ?? null,
        stock: fields.stock ?? 0,
      },
    });
  }

  private usageCountInclude() {
    return {
      _count: {
        select: { productComponents: true },
      },
    } as const;
  }

  private normalizeCatalogItemFields(dto: CreateComponentCatalogItemDto, kindId: string) {
    return {
      kindId,
      name: dto.name.trim(),
      size: dto.size?.trim() || null,
      color: dto.color?.trim() || null,
      material: dto.material?.trim() || null,
    };
  }

  private isSameCatalogProduct(
    existing: {
      kindId: string;
      name: string;
      size: string | null;
      color: string | null;
      material: string | null;
    },
    normalized: {
      kindId: string;
      name: string;
      size: string | null;
      color: string | null;
      material: string | null;
    },
  ): boolean {
    return (
      existing.kindId === normalized.kindId &&
      existing.name.trim() === normalized.name &&
      (existing.size?.trim() || null) === normalized.size &&
      (existing.color?.trim() || null) === normalized.color &&
      (existing.material?.trim() || null) === normalized.material
    );
  }

  private updateExistingCatalogItem(id: string, dto: CreateComponentCatalogItemDto) {
    const patch: Prisma.ComponentCatalogItemUncheckedUpdateInput = {
      price: dto.price,
    };
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto.image !== undefined) patch.image = dto.image;
    if (dto.stock !== undefined) patch.stock = dto.stock;

    return this.prisma.componentCatalogItem.update({
      where: { id },
      data: patch,
      include: {
        ...this.usageCountInclude(),
        ...kindRefInclude,
      },
    });
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    const normalized = base
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    const slug = normalized || 'component';
    let n = 0;
    while (true) {
      const candidate = n === 0 ? slug : `${slug}-${n}`;
      const exists = await this.prisma.componentCatalogItem.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      n += 1;
    }
  }
}
