import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAttributeDto, AttributeValueDto } from './dto/create-attribute.dto';
import { Prisma } from '@prisma/client';

type AttrJsonMeta = { slug: string; name: string };

function isEmptyAttrValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Перенос значений source → keep в Product.attributes (object или array). */
function remapProductAttributesJson(
  attributes: unknown,
  source: AttrJsonMeta,
  keep: AttrJsonMeta,
): { next: unknown; changed: boolean } {
  if (attributes == null) return { next: attributes, changed: false };

  if (Array.isArray(attributes)) {
    const items = attributes.filter((item) => item && typeof item === 'object') as Record<
      string,
      unknown
    >[];
    let changed = false;
    let keepItem: Record<string, unknown> | null = null;
    let sourceItem: Record<string, unknown> | null = null;
    const rest: Record<string, unknown>[] = [];

    for (const item of items) {
      const slug = typeof item.slug === 'string' ? item.slug : '';
      if (slug === keep.slug) {
        keepItem = item;
        continue;
      }
      if (slug === source.slug) {
        sourceItem = item;
        changed = true;
        continue;
      }
      rest.push(item);
    }

    if (sourceItem || keepItem) {
      const prefer =
        keepItem && !isEmptyAttrValue(keepItem.value)
          ? keepItem
          : sourceItem && !isEmptyAttrValue(sourceItem.value)
            ? sourceItem
            : keepItem || sourceItem;
      if (prefer) {
        rest.push({
          ...prefer,
          name: keep.name,
          slug: keep.slug,
        });
        changed = true;
      }
    }

    const normalized = rest.map((item) => {
      const slug = typeof item.slug === 'string' ? item.slug : '';
      const name = typeof item.name === 'string' ? item.name : '';
      if (!slug && name === keep.name) {
        changed = true;
        return { ...item, slug: keep.slug, name: keep.name };
      }
      return item;
    });

    const seenKeep = new Set<number>();
    const deduped: Record<string, unknown>[] = [];
    for (const item of normalized) {
      if (item.slug === keep.slug) {
        if (seenKeep.size > 0) {
          changed = true;
          const existingIdx = [...seenKeep][0];
          const existing = deduped[existingIdx];
          if (isEmptyAttrValue(existing.value) && !isEmptyAttrValue(item.value)) {
            deduped[existingIdx] = item;
          }
          continue;
        }
        seenKeep.add(deduped.length);
      }
      deduped.push(item);
    }

    return { next: deduped, changed };
  }

  if (typeof attributes === 'object') {
    const o = { ...(attributes as Record<string, unknown>) };
    let changed = false;
    if (Object.prototype.hasOwnProperty.call(o, source.slug)) {
      if (isEmptyAttrValue(o[keep.slug]) && !isEmptyAttrValue(o[source.slug])) {
        o[keep.slug] = o[source.slug];
      }
      delete o[source.slug];
      changed = true;
    }
    return { next: o, changed };
  }

  return { next: attributes, changed: false };
}

@Injectable()
export class AttributesService {
  constructor(private prisma: PrismaService) {}

  async create(createAttributeDto: CreateAttributeDto) {
    const { values, ...attributeData } = createAttributeDto;

    const existing = await this.prisma.attribute.findUnique({
      where: { slug: createAttributeDto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Attribute with slug "${createAttributeDto.slug}" already exists`,
      );
    }

    return this.prisma.attribute.create({
      data: {
        ...attributeData,
        values: values
          ? {
              create: values.map((v, index) => ({
                ...v,
                order: v.order ?? index,
              })),
            }
          : undefined,
      },
      include: {
        values: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async findAll(params?: {
    search?: string;
    type?: string;
    isFilterable?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { search, type, isFilterable, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.AttributeWhereInput = {};

    if (type) {
      where.type = type as Prisma.EnumAttributeTypeFilter;
    }

    if (isFilterable !== undefined) {
      where.isFilterable = isFilterable;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const include = {
      values: {
        orderBy: { order: 'asc' as const },
      },
      categories: {
        orderBy: { category: { name: 'asc' as const } },
        select: {
          categoryId: true,
          category: {
            select: { id: true, name: true },
          },
        },
      },
      _count: {
        select: { categories: true },
      },
    };

    const [attributes, total] = await Promise.all([
      this.prisma.attribute.findMany({
        where,
        include,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.attribute.count({ where }),
    ]);

    return {
      data: attributes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      include: {
        values: {
          orderBy: { order: 'asc' },
        },
        categories: {
          orderBy: { category: { name: 'asc' } },
          select: {
            categoryId: true,
            category: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { categories: true },
        },
      },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${id} not found`);
    }

    return attribute;
  }

  async update(id: string, data: Partial<CreateAttributeDto>) {
    const attribute = await this.findOne(id);

    if (data.slug && data.slug !== attribute.slug) {
      const existing = await this.prisma.attribute.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new ConflictException(`Attribute with slug "${data.slug}" already exists`);
      }
    }

    const { values, ...attributeData } = data;

    await this.prisma.attribute.update({
      where: { id },
      data: attributeData,
    });

    if (values !== undefined) {
      await this.prisma.attributeValue.deleteMany({
        where: { attributeId: id },
      });

      if (values.length > 0) {
        await this.prisma.attributeValue.createMany({
          data: values.map((v, index) => ({
            attributeId: id,
            value: v.value,
            colorHex: v.colorHex,
            order: v.order ?? index,
          })),
        });
      }
    }

    return this.findOne(id);
  }

  /**
   * Влить source в keep: привязки категорий, фильтры, варианты, JSON товаров; затем удалить source.
   */
  async merge(keepId: string, sourceId: string) {
    if (keepId === sourceId) {
      throw new BadRequestException('Нельзя объединить характеристику саму с собой');
    }

    const [keep, source] = await Promise.all([
      this.prisma.attribute.findUnique({
        where: { id: keepId },
        include: { values: true, _count: { select: { categories: true } } },
      }),
      this.prisma.attribute.findUnique({
        where: { id: sourceId },
        include: { values: true, _count: { select: { categories: true } } },
      }),
    ]);

    if (!keep) throw new NotFoundException(`Attribute with ID ${keepId} not found`);
    if (!source) throw new NotFoundException(`Attribute with ID ${sourceId} not found`);

    const sourceMeta: AttrJsonMeta = { slug: source.slug, name: source.name };
    const keepMeta: AttrJsonMeta = { slug: keep.slug, name: keep.name };

    const stats = await this.prisma.$transaction(async (tx) => {
      let categoryLinksMoved = 0;
      let categoryLinksDroppedAsDuplicate = 0;
      let filterItemsMoved = 0;
      let filterItemsDroppedAsDuplicate = 0;
      let valuesMerged = 0;
      let productsUpdated = 0;

      const sourceLinks = await tx.categoryAttribute.findMany({
        where: { attributeId: sourceId },
      });
      const keepCategoryIds = new Set(
        (
          await tx.categoryAttribute.findMany({
            where: { attributeId: keepId },
            select: { categoryId: true },
          })
        ).map((l) => l.categoryId),
      );

      for (const link of sourceLinks) {
        if (keepCategoryIds.has(link.categoryId)) {
          await tx.categoryAttribute.delete({ where: { id: link.id } });
          categoryLinksDroppedAsDuplicate += 1;
        } else {
          await tx.categoryAttribute.update({
            where: { id: link.id },
            data: { attributeId: keepId },
          });
          keepCategoryIds.add(link.categoryId);
          categoryLinksMoved += 1;
        }
      }

      const sourceFilterItems = await tx.catalogFilterBlockItem.findMany({
        where: { attributeId: sourceId },
      });
      for (const item of sourceFilterItems) {
        const duplicate = await tx.catalogFilterBlockItem.findFirst({
          where: {
            blockId: item.blockId,
            attributeId: keepId,
            kind: 'ATTRIBUTE',
          },
        });
        if (duplicate) {
          await tx.catalogFilterBlockItem.delete({ where: { id: item.id } });
          filterItemsDroppedAsDuplicate += 1;
        } else {
          await tx.catalogFilterBlockItem.update({
            where: { id: item.id },
            data: { attributeId: keepId },
          });
          filterItemsMoved += 1;
        }
      }

      const keepValueKeys = new Set(
        keep.values.map((v) => v.value.trim().toLowerCase()).filter(Boolean),
      );
      let nextOrder = keep.values.reduce((max, v) => Math.max(max, v.order), -1) + 1;
      for (const v of source.values) {
        const key = v.value.trim().toLowerCase();
        if (!key || keepValueKeys.has(key)) continue;
        await tx.attributeValue.create({
          data: {
            attributeId: keepId,
            value: v.value,
            colorHex: v.colorHex,
            order: nextOrder++,
          },
        });
        keepValueKeys.add(key);
        valuesMerged += 1;
      }

      const candidates = await tx.$queryRaw<Array<{ id: string; attributes: unknown }>>`
        SELECT id, attributes
        FROM products
        WHERE attributes IS NOT NULL
          AND attributes::text ILIKE ${'%' + source.slug + '%'}
      `;

      for (const product of candidates) {
        const { next, changed } = remapProductAttributesJson(
          product.attributes,
          sourceMeta,
          keepMeta,
        );
        if (!changed) continue;
        await tx.product.update({
          where: { id: product.id },
          data: { attributes: next as Prisma.InputJsonValue },
        });
        productsUpdated += 1;
      }

      await tx.attribute.delete({ where: { id: sourceId } });

      return {
        categoryLinksMoved,
        categoryLinksDroppedAsDuplicate,
        filterItemsMoved,
        filterItemsDroppedAsDuplicate,
        valuesMerged,
        productsUpdated,
      };
    });

    const merged = await this.findOne(keepId);
    return {
      keep: merged,
      source: { id: sourceId, name: source.name, slug: source.slug },
      stats,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.attribute.delete({
      where: { id },
    });
  }

  // Attribute Values
  async addValue(attributeId: string, valueDto: AttributeValueDto) {
    await this.findOne(attributeId);

    const maxOrder = await this.prisma.attributeValue.aggregate({
      where: { attributeId },
      _max: { order: true },
    });

    return this.prisma.attributeValue.create({
      data: {
        ...valueDto,
        attributeId,
        order: valueDto.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  async updateValue(valueId: string, valueDto: Partial<AttributeValueDto>) {
    return this.prisma.attributeValue.update({
      where: { id: valueId },
      data: valueDto,
    });
  }

  async removeValue(valueId: string) {
    return this.prisma.attributeValue.delete({
      where: { id: valueId },
    });
  }

  async reorderValues(attributeId: string, items: { id: string; order: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.attributeValue.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    return { success: true };
  }
}
