import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateAttributeDto, AttributeValueDto } from './dto/create-attribute.dto';
import { Prisma } from '@prisma/client';

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
