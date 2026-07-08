import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ComponentKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateComponentCatalogItemDto } from './dto/create-component-catalog-item.dto';
import {
  defaultKitQuantity,
  defaultQuantityStep,
  inferComponentKind,
} from '../../../products/utils/component-catalog-resolve.util';

@Injectable()
export class ComponentCatalogService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateComponentCatalogItemDto) {
    const existing = await this.prisma.componentCatalogItem.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Позиция со slug "${dto.slug}" уже существует`);
    }

    const kind = dto.kind ?? ComponentKind.OTHER;
    const kitQuantity = dto.kitQuantity !== undefined ? dto.kitQuantity : defaultKitQuantity(kind);
    const quantityStep =
      dto.quantityStep !== undefined ? dto.quantityStep : defaultQuantityStep(kind);

    return this.prisma.componentCatalogItem.create({
      data: {
        ...dto,
        kind,
        kitQuantity,
        quantityStep,
      },
      include: this.usageCountInclude(),
    });
  }

  async findAll(params?: {
    search?: string;
    kind?: ComponentKind;
    groupId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      search,
      kind,
      groupId,
      isActive,
      page = 1,
      limit = 50,
      sortBy = 'sortOrder',
      sortOrder = 'asc',
    } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.ComponentCatalogItemWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (kind) where.kind = kind;
    if (groupId) {
      where.groupItems = { some: { groupId } };
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
          groupItems: {
            include: {
              group: { select: { id: true, name: true, series: true } },
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
      kind: { kind: dir },
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
      include: this.usageCountInclude(),
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

    const kind = data.kind ?? row.kind;
    const patch: Prisma.ComponentCatalogItemUpdateInput = { ...data };
    if (data.kind && data.kitQuantity === undefined && row.kitQuantity == null) {
      patch.kitQuantity = defaultKitQuantity(kind);
    }
    if (data.kind && data.quantityStep === undefined && row.quantityStep === 1) {
      patch.quantityStep = defaultQuantityStep(kind);
    }

    return this.prisma.componentCatalogItem.update({
      where: { id },
      data: patch,
      include: this.usageCountInclude(),
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
    const kind = inferComponentKind(fields.name, fields.type);
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
        kind,
        name: fields.name.trim(),
        size,
        price: fields.price,
        slug,
        image: fields.image ?? null,
        stock: fields.stock ?? 0,
        kitQuantity: defaultKitQuantity(kind),
        quantityStep: defaultQuantityStep(kind),
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
