import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

const SLUGS = ['furniture', 'repair', 'doors', 'windows', 'ceilings', 'blinds', 'sales'] as const;
export type DirectionSlug = (typeof SLUGS)[number];

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'directions');

@Injectable()
export class HomeDirectionsService {
  constructor(private prisma: PrismaService) {}

  async getImages(baseUrl?: string): Promise<Record<string, string>> {
    const records = await this.prisma.homeDirectionImage.findMany();
    const map: Record<string, string> = {};
    for (const slug of SLUGS) {
      const r = records.find((x) => x.slug === slug);
      if (r?.imageUrl) {
        map[slug] = baseUrl ? `${baseUrl.replace(/\/$/, '')}${r.imageUrl}` : r.imageUrl;
      }
    }
    return map;
  }

  async uploadImage(
    slug: string,
    file: Express.Multer.File,
    baseUrl: string,
  ): Promise<{ slug: string; imageUrl: string }> {
    if (!SLUGS.includes(slug as DirectionSlug)) {
      throw new BadRequestException(`Недопустимый slug. Допустимые: ${SLUGS.join(', ')}`);
    }
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${slug}-${Date.now()}${ext}`;
    const destDir = UPLOADS_DIR;
    const destPath = path.join(destDir, filename);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.renameSync(file.path, destPath);
    const imageUrl = `/uploads/directions/${filename}`;
    const fullUrl = `${baseUrl.replace(/\/$/, '')}${imageUrl}`;
    await this.prisma.homeDirectionImage.upsert({
      where: { slug },
      create: { slug, imageUrl },
      update: { imageUrl },
    });
    return { slug, imageUrl: fullUrl };
  }

  getSlugs(): string[] {
    return [...SLUGS];
  }
}
