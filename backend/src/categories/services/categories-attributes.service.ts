import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CategoriesCrudService } from './categories-crud.service';

export interface AddAttributeDto {
  attributeId: string;
  isRequired?: boolean;
  order?: number;
}

export interface BulkAttributeDto {
  attributeIds: string[];
  isRequired?: boolean;
}

export interface ApplyAttributesToProductsDto {
  attributeId: string;
  defaultValue?: string;
}

@Injectable()
export class CategoriesAttributesService {
  constructor(
    private prisma: PrismaService,
    private crud: CategoriesCrudService,
  ) {}

  async inheritAttributesFromParentPublic(categoryId: string) {
    const category = await this.crud.findOne(categoryId);

    if (!category.parentId) {
      throw new BadRequestException('Эта категория не имеет родительской категории');
    }

    const result = await this.crud.inheritAttributesFromParent(categoryId, category.parentId);
    const attributes = await this.getCategoryAttributes(categoryId);

    return {
      message: `Унаследовано атрибутов: ${result.inherited}, пропущено (уже существуют): ${result.skipped}`,
      inherited: result.inherited,
      skipped: result.skipped,
      attributes,
    };
  }

  async getCategoryAttributes(categoryId: string) {
    await this.crud.findOne(categoryId);

    const ownRows = await this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      include: this.categoryAttributeInclude(),
      orderBy: { order: 'asc' },
    });

    const ownAttrIds = new Set(ownRows.map((r) => r.attributeId));
    const inheritedRows = await this.getInheritedCategoryAttributesFromAncestors(
      categoryId,
      ownAttrIds,
    );

    const requiredInAncestors = await this.getAttributeIdsRequiredInAncestors(categoryId);

    const merged = [...ownRows, ...inheritedRows].map((row) => ({
      ...row,
      isInherited: !ownAttrIds.has(row.attributeId),
      isRequired: row.isRequired || requiredInAncestors.has(row.attributeId),
    }));

    merged.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.attribute.name.localeCompare(b.attribute.name, 'ru');
    });

    return merged;
  }

  async getMergedAttributesForCategories(categoryIds: string[]) {
    const uniqueIds = [...new Set(categoryIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const attributeLists = await Promise.all(
      uniqueIds.map((categoryId) => this.getCategoryAttributes(categoryId)),
    );

    const map = new Map<string, { id: string; name: string; slug: string; type: string }>();

    for (const rows of attributeLists) {
      for (const row of rows) {
        const attr = row.attribute;
        if (!map.has(attr.slug)) {
          map.set(attr.slug, {
            id: attr.id,
            name: attr.name,
            slug: attr.slug,
            type: attr.type,
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  async addAttributeToCategory(categoryId: string, dto: AddAttributeDto) {
    await this.crud.findOne(categoryId);

    const attribute = await this.prisma.attribute.findUnique({
      where: { id: dto.attributeId },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${dto.attributeId} not found`);
    }

    const existing = await this.prisma.categoryAttribute.findUnique({
      where: {
        categoryId_attributeId: {
          categoryId,
          attributeId: dto.attributeId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Этот атрибут уже добавлен к категории');
    }

    const inheritedRequired = await this.getAttributeIdsRequiredInAncestors(categoryId);
    const isRequired = Boolean(dto.isRequired) || inheritedRequired.has(dto.attributeId);

    return this.prisma.categoryAttribute.create({
      data: {
        categoryId,
        attributeId: dto.attributeId,
        isRequired,
        order: dto.order ?? 0,
      },
      include: this.categoryAttributeInclude(),
    });
  }

  async bulkAddAttributesToCategory(categoryId: string, dto: BulkAttributeDto) {
    await this.crud.findOne(categoryId);

    const results = [];

    for (const attributeId of dto.attributeIds) {
      try {
        const result = await this.addAttributeToCategory(categoryId, {
          attributeId,
          isRequired: dto.isRequired,
        });
        results.push({ attributeId, success: true, data: result });
      } catch (error) {
        results.push({
          attributeId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  async removeAttributeFromCategory(categoryId: string, attributeId: string) {
    const categoryAttribute = await this.prisma.categoryAttribute.findUnique({
      where: {
        categoryId_attributeId: {
          categoryId,
          attributeId,
        },
      },
    });

    if (!categoryAttribute) {
      const fromAncestor = await this.findNearestAncestorCategoryAttributeRow(
        categoryId,
        attributeId,
      );
      if (fromAncestor) {
        throw new BadRequestException(
          'Этот атрибут задан у родительской категории. Открепите его там или снимите наследование.',
        );
      }
      throw new NotFoundException('Атрибут не найден в этой категории');
    }

    return this.prisma.categoryAttribute.delete({
      where: { id: categoryAttribute.id },
    });
  }

  async updateCategoryAttribute(
    categoryId: string,
    attributeId: string,
    data: { isRequired?: boolean; order?: number },
  ) {
    let categoryAttribute = await this.prisma.categoryAttribute.findUnique({
      where: {
        categoryId_attributeId: {
          categoryId,
          attributeId,
        },
      },
    });

    if (!categoryAttribute) {
      const materialized = await this.materializeCategoryAttributeForChildIfMissing(
        categoryId,
        attributeId,
      );
      if (!materialized) {
        throw new NotFoundException('Атрибут не найден в этой категории');
      }
      categoryAttribute = materialized;
    }

    if (data.isRequired === false) {
      const inheritedRequired = await this.getAttributeIdsRequiredInAncestors(categoryId);
      if (inheritedRequired.has(attributeId)) {
        throw new BadRequestException(
          'Нельзя снять обязательность: атрибут помечен как обязательный в родительской категории',
        );
      }
    }

    const updated = await this.prisma.categoryAttribute.update({
      where: { id: categoryAttribute.id },
      data,
      include: {
        attribute: {
          include: { values: true },
        },
      },
    });

    const inheritedRequired = await this.getAttributeIdsRequiredInAncestors(categoryId);
    return {
      ...updated,
      isRequired: updated.isRequired || inheritedRequired.has(attributeId),
    };
  }

  async applyAttributesToProducts(categoryId: string, attributes: ApplyAttributesToProductsDto[]) {
    await this.crud.findOne(categoryId);

    const products = await this.prisma.product.findMany({
      where: { categoryId },
    });

    const results = {
      totalProducts: products.length,
      updated: 0,
      errors: [] as string[],
    };

    for (const product of products) {
      try {
        const currentAttributes = (product.attributes as Record<string, unknown>) || {};
        const newAttributes = { ...currentAttributes };

        for (const attr of attributes) {
          const attribute = await this.prisma.attribute.findUnique({
            where: { id: attr.attributeId },
          });

          if (attribute && !(attribute.slug in newAttributes)) {
            newAttributes[attribute.slug] = attr.defaultValue || '';
          }
        }

        await this.prisma.product.update({
          where: { id: product.id },
          data: { attributes: newAttributes as Prisma.InputJsonValue },
        });

        results.updated++;
      } catch (error) {
        results.errors.push(
          `Product ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return results;
  }

  async getAllAttributes() {
    return this.prisma.attribute.findMany({
      include: {
        values: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async createAttribute(data: {
    name: string;
    slug: string;
    type?: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'COLOR';
    unit?: string;
    isFilterable?: boolean;
    values?: string[];
  }) {
    const attribute = await this.prisma.attribute.create({
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type || 'TEXT',
        unit: data.unit,
        isFilterable: data.isFilterable ?? true,
      },
    });

    if (data.values && data.values.length > 0) {
      await this.prisma.attributeValue.createMany({
        data: data.values.map((value, index) => ({
          attributeId: attribute.id,
          value,
          order: index,
        })),
      });
    }

    return this.prisma.attribute.findUnique({
      where: { id: attribute.id },
      include: { values: true },
    });
  }

  async updateAttribute(
    id: string,
    data: {
      name?: string;
      slug?: string;
      type?: string;
      unit?: string | null;
      isFilterable?: boolean;
      values?: string[];
    },
  ) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${id} not found`);
    }

    if (data.slug && data.slug !== attribute.slug) {
      const existing = await this.prisma.attribute.findUnique({
        where: { slug: data.slug },
      });
      if (existing) {
        throw new ConflictException(`Attribute with slug "${data.slug}" already exists`);
      }
    }

    await this.prisma.attribute.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type as 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'COLOR',
        unit: data.unit,
        isFilterable: data.isFilterable,
      },
    });

    if (data.values !== undefined) {
      await this.prisma.attributeValue.deleteMany({
        where: { attributeId: id },
      });

      if (data.values.length > 0) {
        await this.prisma.attributeValue.createMany({
          data: data.values.map((value, index) => ({
            attributeId: id,
            value,
            order: index,
          })),
        });
      }
    }

    return this.prisma.attribute.findUnique({
      where: { id },
      include: { values: { orderBy: { order: 'asc' } } },
    });
  }

  async deleteAttribute(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${id} not found`);
    }

    return this.prisma.attribute.delete({
      where: { id },
    });
  }

  private async getAncestorCategoryIds(categoryId: string): Promise<string[]> {
    const ids: string[] = [];
    let current = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { parentId: true },
    });
    while (current?.parentId) {
      ids.push(current.parentId);
      current = await this.prisma.category.findUnique({
        where: { id: current.parentId },
        select: { parentId: true },
      });
    }
    return ids;
  }

  private async getAttributeIdsRequiredInAncestors(categoryId: string): Promise<Set<string>> {
    const ancestorIds = await this.getAncestorCategoryIds(categoryId);
    if (ancestorIds.length === 0) {
      return new Set();
    }
    const rows = await this.prisma.categoryAttribute.findMany({
      where: {
        categoryId: { in: ancestorIds },
        isRequired: true,
      },
      select: { attributeId: true },
    });
    return new Set(rows.map((r) => r.attributeId));
  }

  private categoryAttributeInclude() {
    return {
      attribute: {
        include: {
          values: {
            orderBy: { order: 'asc' as const },
          },
        },
      },
    } as const;
  }

  private async getInheritedCategoryAttributesFromAncestors(
    categoryId: string,
    ownAttributeIds: Set<string>,
  ) {
    const ancestorIds = await this.getAncestorCategoryIds(categoryId);
    if (ancestorIds.length === 0) {
      return [];
    }

    const ancRows = await this.prisma.categoryAttribute.findMany({
      where: { categoryId: { in: ancestorIds } },
      include: this.categoryAttributeInclude(),
      orderBy: { order: 'asc' },
    });

    const byCategory = new Map<string, typeof ancRows>();
    for (const r of ancRows) {
      const list = byCategory.get(r.categoryId) ?? [];
      list.push(r);
      byCategory.set(r.categoryId, list);
    }

    const seen = new Set<string>();
    const inherited: typeof ancRows = [];

    for (const ancId of ancestorIds) {
      const list = byCategory.get(ancId) ?? [];
      for (const r of list) {
        if (ownAttributeIds.has(r.attributeId)) continue;
        if (seen.has(r.attributeId)) continue;
        seen.add(r.attributeId);
        inherited.push({
          ...r,
          id: `${categoryId}::inherited::${r.attributeId}`,
          categoryId,
        });
      }
    }

    return inherited;
  }

  private async findNearestAncestorCategoryAttributeRow(categoryId: string, attributeId: string) {
    const ancestorIds = await this.getAncestorCategoryIds(categoryId);
    for (const ancId of ancestorIds) {
      const row = await this.prisma.categoryAttribute.findUnique({
        where: {
          categoryId_attributeId: {
            categoryId: ancId,
            attributeId,
          },
        },
      });
      if (row) return row;
    }
    return null;
  }

  private async materializeCategoryAttributeForChildIfMissing(
    categoryId: string,
    attributeId: string,
  ) {
    const existing = await this.prisma.categoryAttribute.findUnique({
      where: {
        categoryId_attributeId: { categoryId, attributeId },
      },
    });
    if (existing) return existing;

    const template = await this.findNearestAncestorCategoryAttributeRow(categoryId, attributeId);
    if (!template) return null;

    const inheritedRequired = await this.getAttributeIdsRequiredInAncestors(categoryId);
    const isRequired = template.isRequired || inheritedRequired.has(attributeId);

    return this.prisma.categoryAttribute.create({
      data: {
        categoryId,
        attributeId,
        isRequired,
        order: template.order,
      },
    });
  }
}
