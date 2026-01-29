import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'hero');

export interface HeroData {
  block: { titleMain: string; titleAccent: string; subtitle: string };
  slides: { id: string; imageUrl: string; sortOrder: number }[];
  features: { id: string; icon: string; title: string; sortOrder: number }[];
}

@Injectable()
export class HeroService {
  constructor(private prisma: PrismaService) {}

  async getHeroData(baseUrl?: string): Promise<HeroData> {
    const [block, slides, features] = await Promise.all([
      this.prisma.heroBlock.findFirst({ where: { id: 'main' } }),
      this.prisma.heroSlide.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.heroFeature.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    const prefix = baseUrl ? baseUrl.replace(/\/$/, '') : '';

    return {
      block: block
        ? {
            titleMain: block.titleMain,
            titleAccent: block.titleAccent,
            subtitle: block.subtitle,
          }
        : {
            titleMain: 'Создаем интерьеры мечты',
            titleAccent: 'в Мурманске',
            subtitle:
              'Мебель на заказ, ремонт под ключ, двери входные и межкомнатные, натяжные потолки, жалюзи, мягкая мебель, кровати, матрасы .....',
          },
      slides: slides.map((s) => ({
        id: s.id,
        imageUrl: s.imageUrl.startsWith('http') ? s.imageUrl : `${prefix}${s.imageUrl}`,
        sortOrder: s.sortOrder,
      })),
      features: features.map((f) => ({
        id: f.id,
        icon: f.icon,
        title: f.title,
        sortOrder: f.sortOrder,
      })),
    };
  }

  async updateBlock(data: { titleMain?: string; titleAccent?: string; subtitle?: string }) {
    return this.prisma.heroBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        titleMain: data.titleMain ?? 'Создаем интерьеры мечты',
        titleAccent: data.titleAccent ?? 'в Мурманске',
        subtitle: data.subtitle ?? '',
      },
      update: {
        ...(data.titleMain !== undefined && { titleMain: data.titleMain }),
        ...(data.titleAccent !== undefined && { titleAccent: data.titleAccent }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
      },
    });
  }

  async uploadSlide(
    file: Express.Multer.File,
    baseUrl: string,
  ): Promise<{ id: string; imageUrl: string; sortOrder: number }> {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const count = await this.prisma.heroSlide.count();
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `hero-${Date.now()}${ext}`;
    const destPath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    fs.renameSync(file.path, destPath);
    const imageUrl = `/uploads/hero/${filename}`;
    const slide = await this.prisma.heroSlide.create({
      data: { imageUrl, sortOrder: count },
    });
    const prefix = baseUrl.replace(/\/$/, '');
    return {
      id: slide.id,
      imageUrl: `${prefix}${imageUrl}`,
      sortOrder: slide.sortOrder,
    };
  }

  async deleteSlide(id: string) {
    const slide = await this.prisma.heroSlide.findUnique({ where: { id } });
    if (!slide) {
      throw new NotFoundException('Слайд не найден');
    }
    const filePath = path.join(process.cwd(), slide.imageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await this.prisma.heroSlide.delete({ where: { id } });
    return { success: true };
  }

  async reorderSlides(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.heroSlide.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.prisma.heroSlide.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createFeature(data: { icon: string; title: string }) {
    const count = await this.prisma.heroFeature.count();
    return this.prisma.heroFeature.create({
      data: { icon: data.icon, title: data.title, sortOrder: count },
    });
  }

  async updateFeature(id: string, data: { icon?: string; title?: string; sortOrder?: number }) {
    const feature = await this.prisma.heroFeature.findUnique({ where: { id } });
    if (!feature) {
      throw new NotFoundException('Преимущество не найдено');
    }
    return this.prisma.heroFeature.update({
      where: { id },
      data: {
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
  }

  async deleteFeature(id: string) {
    const feature = await this.prisma.heroFeature.findUnique({ where: { id } });
    if (!feature) {
      throw new NotFoundException('Преимущество не найдено');
    }
    await this.prisma.heroFeature.delete({ where: { id } });
    return { success: true };
  }

  async reorderFeatures(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.heroFeature.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.prisma.heroFeature.findMany({ orderBy: { sortOrder: 'asc' } });
  }
}
