import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createCategoryDto,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findAll() {
    // Возвращаем только корневые категории с вложенными дочерними
    return this.prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null, // Только корневые категории
      },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
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

  // Получить все атрибуты категории
  async getCategoryAttributes(categoryId: string) {
    await this.findOne(categoryId);

    return this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      include: {
        attribute: {
          include: {
            values: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
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

    return this.prisma.categoryAttribute.create({
      data: {
        categoryId,
        attributeId: dto.attributeId,
        isRequired: dto.isRequired ?? false,
        order: dto.order ?? 0,
      },
      include: {
        attribute: {
          include: { values: true },
        },
      },
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
    const categoryAttribute = await this.prisma.categoryAttribute.findUnique({
      where: {
        categoryId_attributeId: {
          categoryId,
          attributeId,
        },
      },
    });

    if (!categoryAttribute) {
      throw new NotFoundException('Атрибут не найден в этой категории');
    }

    return this.prisma.categoryAttribute.update({
      where: { id: categoryAttribute.id },
      data,
      include: {
        attribute: {
          include: { values: true },
        },
      },
    });
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
}
