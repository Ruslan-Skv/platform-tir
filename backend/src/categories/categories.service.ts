import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

interface AddAttributeDto {
  attributeId: string;
  isRequired?: boolean;
  order?: number;
}

interface BulkAttributeDto {
  attributeIds: string[];
  isRequired?: boolean;
}

interface ApplyAttributesToProductsDto {
  attributeId: string;
  defaultValue?: string;
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto, createdByUserId?: string) {
    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        slug: createCategoryDto.slug,
        description: createCategoryDto.description,
        image: createCategoryDto.image,
        icon: createCategoryDto.icon,
        parentId: createCategoryDto.parentId ?? undefined,
        order: createCategoryDto.order ?? 0,
        isActive: createCategoryDto.isActive ?? true,
        createdById: createdByUserId ?? null,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    // Если есть родительская категория - наследуем её атрибуты
    if (createCategoryDto.parentId) {
      await this.inheritAttributesFromParent(category.id, createCategoryDto.parentId);
    }

    return category;
  }

  // Наследование атрибутов от родительской категории (приватный метод)
  private async inheritAttributesFromParent(categoryId: string, parentId: string) {
    // Получаем атрибуты родительской категории
    const parentAttributes = await this.prisma.categoryAttribute.findMany({
      where: { categoryId: parentId },
      orderBy: { order: 'asc' },
    });

    if (parentAttributes.length === 0) {
      return { inherited: 0, skipped: 0 };
    }

    // Получаем уже существующие атрибуты категории
    const existingAttributes = await this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      select: { attributeId: true },
    });
    const existingAttributeIds = new Set(existingAttributes.map((a) => a.attributeId));

    // Фильтруем только те атрибуты, которых ещё нет
    const attributesToAdd = parentAttributes.filter(
      (attr) => !existingAttributeIds.has(attr.attributeId),
    );

    if (attributesToAdd.length === 0) {
      return { inherited: 0, skipped: parentAttributes.length };
    }

    // Копируем атрибуты в категорию
    await this.prisma.categoryAttribute.createMany({
      data: attributesToAdd.map((attr) => ({
        categoryId,
        attributeId: attr.attributeId,
        isRequired: attr.isRequired,
        order: attr.order,
      })),
    });

    return {
      inherited: attributesToAdd.length,
      skipped: parentAttributes.length - attributesToAdd.length,
    };
  }

  // Публичный метод для наследования атрибутов от родителя
  async inheritAttributesFromParentPublic(categoryId: string) {
    const category = await this.findOne(categoryId);

    if (!category.parentId) {
      throw new BadRequestException('Эта категория не имеет родительской категории');
    }

    const result = await this.inheritAttributesFromParent(categoryId, category.parentId);

    // Возвращаем обновлённый список атрибутов категории
    const attributes = await this.getCategoryAttributes(categoryId);

    return {
      message: `Унаследовано атрибутов: ${result.inherited}, пропущено (уже существуют): ${result.skipped}`,
      inherited: result.inherited,
      skipped: result.skipped,
      attributes,
    };
  }

  async findAll(includeInactive = false) {
    // Возвращаем только корневые категории с вложенными дочерними
    const whereClause = includeInactive ? {} : { isActive: true };
    const childrenWhere = includeInactive ? {} : { isActive: true };

    const categories = await this.prisma.category.findMany({
      where: {
        ...whereClause,
        parentId: null, // Только корневые категории
      },
      include: {
        children: {
          where: childrenWhere,
          include: {
            children: {
              where: childrenWhere,
              include: {
                _count: {
                  select: { products: true },
                },
              },
            },
            _count: {
              select: { products: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Рекурсивно подсчитываем общее количество товаров включая подкатегории
    const calculateTotalProducts = (
      category: (typeof categories)[0],
    ): (typeof categories)[0] & { _count: { products: number; totalProducts: number } } => {
      let totalProducts = category._count.products;

      const processedChildren = category.children?.map((child) => {
        const processedChild = calculateTotalProducts(child as (typeof categories)[0]);
        totalProducts += processedChild._count.totalProducts;
        return processedChild;
      });

      return {
        ...category,
        children: processedChildren,
        _count: {
          products: category._count.products,
          totalProducts,
        },
      };
    };

    return categories.map(calculateTotalProducts);
  }

  // Получить все категории плоским списком (для админки)
  async findAllFlat() {
    return this.prisma.category.findMany({
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    });
  }

  // Получить структуру навигации для публичной части
  async getNavigationStructure() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Строим структуру для навигации
    const rootCategories = categories.filter((c) => !c.parentId);

    return rootCategories.map((root) => ({
      name: root.name,
      slug: root.slug,
      href: `/catalog/products/${root.slug}`,
      productCount: root._count.products,
      hasSubmenu: root.children.length > 0,
      submenu: root.children.map((child) => ({
        name: child.name,
        slug: child.slug,
        href: `/catalog/products/${root.slug}/${child.slug.replace(`${root.slug}-`, '')}`,
        productCount:
          (child as typeof child & { _count?: { products: number } })._count?.products || 0,
      })),
    }));
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: {
          where: { isActive: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: true,
        products: {
          where: { isActive: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.category.delete({
      where: { id },
    });
  }

  // ==================== АТРИБУТЫ КАТЕГОРИИ ====================

  /** Цепочка id родителей от прямого родителя к корню (без текущей категории). */
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

  /** attributeId, для которых isRequired=true хотя бы у одного предка (та же связь категория–атрибут). */
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

  /**
   * Атрибуты, заданные у предков, но ещё без своей строки у текущей категории
   * (в т.ч. список значений SELECT / MULTI_SELECT с родителя).
   * Ближайший предок имеет приоритет при дублировании attributeId.
   */
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

  /** Ближайшая строка categoryAttribute у предка (для материализации у потомка). */
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

  /** Создать связь категория–атрибут у потомка по образцу предка (после PATCH и т.п.). */
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

  /** Получить все атрибуты категории: свои + унаследованные от предков (выпадающие списки и т.д.), эффективный isRequired. */
  async getCategoryAttributes(categoryId: string) {
    await this.findOne(categoryId);

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

    const combined = [...ownRows, ...inheritedRows];
    const requiredInAncestors = await this.getAttributeIdsRequiredInAncestors(categoryId);

    const merged = combined.map((row) => ({
      ...row,
      isRequired: row.isRequired || requiredInAncestors.has(row.attributeId),
    }));

    merged.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.attribute.name.localeCompare(b.attribute.name, 'ru');
    });

    return merged;
  }

  /** Объединённые атрибуты (с учётом наследования) для нескольких категорий. */
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

  // Добавить атрибут к категории
  async addAttributeToCategory(categoryId: string, dto: AddAttributeDto) {
    await this.findOne(categoryId);

    // Проверяем существование атрибута
    const attribute = await this.prisma.attribute.findUnique({
      where: { id: dto.attributeId },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${dto.attributeId} not found`);
    }

    // Проверяем, не добавлен ли уже
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

  // Массовое добавление атрибутов к категории
  async bulkAddAttributesToCategory(categoryId: string, dto: BulkAttributeDto) {
    await this.findOne(categoryId);

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

  // Удалить атрибут из категории
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

  // Обновить настройки атрибута в категории
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

  // Применить атрибуты категории ко всем её товарам
  async applyAttributesToProducts(categoryId: string, attributes: ApplyAttributesToProductsDto[]) {
    await this.findOne(categoryId);

    // Получаем все товары категории
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
        // Текущие атрибуты товара
        const currentAttributes = (product.attributes as Record<string, unknown>) || {};

        // Добавляем новые атрибуты (не перезаписывая существующие)
        const newAttributes = { ...currentAttributes };

        for (const attr of attributes) {
          // Получаем информацию об атрибуте
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

  // Получить все доступные атрибуты (для выбора)
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

  // Создать новый атрибут
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

    // Если переданы значения для SELECT типа
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

  // Обновить атрибут
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

    // Если меняется slug - проверяем уникальность
    if (data.slug && data.slug !== attribute.slug) {
      const existing = await this.prisma.attribute.findUnique({
        where: { slug: data.slug },
      });
      if (existing) {
        throw new ConflictException(`Attribute with slug "${data.slug}" already exists`);
      }
    }

    // Обновляем атрибут
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

    // Если переданы значения - обновляем их
    if (data.values !== undefined) {
      // Удаляем старые значения
      await this.prisma.attributeValue.deleteMany({
        where: { attributeId: id },
      });

      // Создаём новые
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

  // Удалить атрибут
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
}
