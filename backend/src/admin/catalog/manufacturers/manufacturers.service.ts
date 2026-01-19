import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ManufacturersService {
  constructor(private prisma: PrismaService) {}

  async create(createManufacturerDto: CreateManufacturerDto) {
    const existing = await this.prisma.manufacturer.findUnique({
      where: { slug: createManufacturerDto.slug },
    });

    if (existing) {
      throw new ConflictException(
        `Manufacturer with slug "${createManufacturerDto.slug}" already exists`,
      );
    }

    return this.prisma.manufacturer.create({
      data: createManufacturerDto,
    });
  }

  async findAll(params?: { search?: string; isActive?: boolean; page?: number; limit?: number }) {
    const { search, isActive, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.ManufacturerWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [manufacturers, total] = await Promise.all([
      this.prisma.manufacturer.findMany({
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
      this.prisma.manufacturer.count({ where }),
    ]);

    return {
      data: manufacturers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const manufacturer = await this.prisma.manufacturer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!manufacturer) {
      throw new NotFoundException(`Manufacturer with ID ${id} not found`);
    }

    return manufacturer;
  }

  async update(id: string, data: Partial<CreateManufacturerDto>) {
    const manufacturer = await this.findOne(id);

    if (data.slug && data.slug !== manufacturer.slug) {
      const existing = await this.prisma.manufacturer.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new ConflictException(`Manufacturer with slug "${data.slug}" already exists`);
      }
    }

    return this.prisma.manufacturer.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.manufacturer.delete({
      where: { id },
    });
  }

  async reorder(items: { id: string; order: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.manufacturer.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    return { success: true };
  }
}
