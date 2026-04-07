import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateCanvasTypeDto } from './dto/create-canvas-type.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CanvasTypesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCanvasTypeDto) {
    const existing = await this.prisma.canvasType.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Canvas type with slug "${dto.slug}" already exists`);
    }

    return this.prisma.canvasType.create({
      data: dto,
    });
  }

  async findAll(params?: { search?: string; isActive?: boolean; page?: number; limit?: number }) {
    const { search, isActive, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.CanvasTypeWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
    }

    const [rows, total] = await Promise.all([
      this.prisma.canvasType.findMany({
        where,
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { order: 'asc' },
      }),
      this.prisma.canvasType.count({ where }),
    ]);

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.canvasType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException(`Canvas type with ID ${id} not found`);
    }

    return row;
  }

  async update(id: string, data: Partial<CreateCanvasTypeDto>) {
    const row = await this.findOne(id);

    if (data.slug && data.slug !== row.slug) {
      const existing = await this.prisma.canvasType.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new ConflictException(`Canvas type with slug "${data.slug}" already exists`);
      }
    }

    return this.prisma.canvasType.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.updateMany({
      where: { canvasTypeId: id },
      data: { canvasTypeId: null },
    });
    return this.prisma.canvasType.delete({
      where: { id },
    });
  }

  async reorder(items: { id: string; order: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.canvasType.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    return { success: true };
  }
}
