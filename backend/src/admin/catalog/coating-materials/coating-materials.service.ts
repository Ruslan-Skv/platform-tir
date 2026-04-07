import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateCoatingMaterialDto } from './dto/create-coating-material.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CoatingMaterialsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCoatingMaterialDto) {
    const existing = await this.prisma.coatingMaterial.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Coating material with slug "${dto.slug}" already exists`);
    }

    return this.prisma.coatingMaterial.create({
      data: dto,
    });
  }

  async findAll(params?: { search?: string; isActive?: boolean; page?: number; limit?: number }) {
    const { search, isActive, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.CoatingMaterialWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
    }

    const [rows, total] = await Promise.all([
      this.prisma.coatingMaterial.findMany({
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
      this.prisma.coatingMaterial.count({ where }),
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
    const row = await this.prisma.coatingMaterial.findUnique({
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
      throw new NotFoundException(`Coating material with ID ${id} not found`);
    }

    return row;
  }

  async update(id: string, data: Partial<CreateCoatingMaterialDto>) {
    const row = await this.findOne(id);

    if (data.slug && data.slug !== row.slug) {
      const existing = await this.prisma.coatingMaterial.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new ConflictException(`Coating material with slug "${data.slug}" already exists`);
      }
    }

    return this.prisma.coatingMaterial.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.updateMany({
      where: { coatingMaterialId: id },
      data: { coatingMaterialId: null },
    });
    return this.prisma.coatingMaterial.delete({
      where: { id },
    });
  }

  async reorder(items: { id: string; order: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.coatingMaterial.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    return { success: true };
  }
}
