import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { extname } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionService {
  constructor(private prisma: PrismaService) {}

  async uploadImage(file: Express.Multer.File, baseUrl: string): Promise<{ imageUrl: string }> {
    if (!file?.path) {
      throw new ConflictException('Файл не загружен');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'promotions');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = extname(file.originalname) || '.jpg';
    const filename = `promo-${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destPath);
    const imageUrl = `/uploads/promotions/${filename}`;
    const prefix = baseUrl.replace(/\/$/, '');
    return { imageUrl: `${prefix}${imageUrl}` };
  }

  async create(dto: CreatePromotionDto) {
    const existing = await this.prisma.promotion.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Акция с slug "${dto.slug}" уже существует`);
    }
    return this.prisma.promotion.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        imageUrl: dto.imageUrl,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(params?: { page?: number; limit?: number }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.promotion.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.promotion.count(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { id },
    });
    if (!promo) {
      throw new NotFoundException(`Акция "${id}" не найдена`);
    }
    return promo;
  }

  async findBySlug(slug: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { slug },
    });
    if (!promo) {
      throw new NotFoundException(`Акция "${slug}" не найдена`);
    }
    return promo;
  }

  async update(id: string, dto: UpdatePromotionDto) {
    await this.findOne(id);
    if (dto.slug) {
      const existing = await this.prisma.promotion.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Акция с slug "${dto.slug}" уже существует`);
      }
    }
    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.promotion.delete({
      where: { id },
    });
  }

  // Public API — только активные акции
  async getPublicList() {
    return this.prisma.promotion.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }
}
