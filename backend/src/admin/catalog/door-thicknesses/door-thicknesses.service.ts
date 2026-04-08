import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDoorThicknessDto } from './dto/create-door-thickness.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DoorThicknessesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDoorThicknessDto) {
    const existing = await this.prisma.doorThickness.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Door thickness with slug "${dto.slug}" already exists`);
    }

    return this.prisma.doorThickness.create({
      data: dto,
    });
  }

  async findAll(params?: { search?: string; isActive?: boolean; page?: number; limit?: number }) {
    const { search, isActive, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.DoorThicknessWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
    }

    const [rows, total] = await Promise.all([
      this.prisma.doorThickness.findMany({
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
      this.prisma.doorThickness.count({ where }),
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
    const row = await this.prisma.doorThickness.findUnique({
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
      throw new NotFoundException(`Door thickness with ID ${id} not found`);
    }

    return row;
  }

  async update(id: string, data: Partial<CreateDoorThicknessDto>) {
    const row = await this.findOne(id);

    if (data.slug && data.slug !== row.slug) {
      const existing = await this.prisma.doorThickness.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new ConflictException(`Door thickness with slug "${data.slug}" already exists`);
      }
    }

    return this.prisma.doorThickness.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.updateMany({
      where: { doorThicknessId: id },
      data: { doorThicknessId: null },
    });
    return this.prisma.doorThickness.delete({
      where: { id },
    });
  }

  async reorder(items: { id: string; order: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.doorThickness.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    return { success: true };
  }
}
