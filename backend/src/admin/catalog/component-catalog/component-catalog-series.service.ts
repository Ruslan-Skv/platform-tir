import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateComponentCatalogSeriesDto } from './dto/create-component-catalog-series.dto';

@Injectable()
export class ComponentCatalogSeriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateComponentCatalogSeriesDto) {
    const existing = await this.prisma.componentCatalogSeries.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Группа моделей со slug "${dto.slug}" уже существует`);
    }

    await this.ensureSupplierExists(dto.supplierId);

    return this.prisma.componentCatalogSeries.create({
      data: dto,
      include: this.seriesInclude(),
    });
  }

  async findAll(params?: {
    search?: string;
    categoryId?: string;
    supplierId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { search, categoryId, supplierId, isActive, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;
    const where: Prisma.ComponentCatalogSeriesWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.componentCatalogSeries.findMany({
        where,
        include: this.seriesInclude(),
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.componentCatalogSeries.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const row = await this.prisma.componentCatalogSeries.findUnique({
      where: { id },
      include: this.seriesInclude(),
    });
    if (!row) throw new NotFoundException(`Группа моделей ${id} не найдена`);
    return row;
  }

  async update(id: string, data: Partial<CreateComponentCatalogSeriesDto>) {
    await this.findOne(id);
    if (data.slug) {
      const existing = await this.prisma.componentCatalogSeries.findFirst({
        where: { slug: data.slug, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Группа моделей со slug "${data.slug}" уже существует`);
      }
    }

    if (data.supplierId !== undefined) {
      await this.ensureSupplierExists(data.supplierId);
    }

    return this.prisma.componentCatalogSeries.update({
      where: { id },
      data,
      include: this.seriesInclude(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.componentCatalogSeries.delete({ where: { id } });
  }

  async reorder(items: { id: string; sortOrder: number }[]) {
    if (!items.length) return { success: true };
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.componentCatalogSeries.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return { success: true };
  }

  private seriesInclude() {
    return {
      category: { select: { id: true, name: true, slug: true } },
      supplier: { select: { id: true, legalName: true, commercialName: true } },
      subgroups: {
        orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }],
        include: {
          _count: { select: { items: true } },
        },
      },
      _count: { select: { subgroups: true } },
    };
  }

  private async ensureSupplierExists(supplierId?: string | null) {
    if (!supplierId) return;
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      throw new BadRequestException(`Поставщик ${supplierId} не найден`);
    }
  }
}
