import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as path from 'path';

export interface AdvantagesData {
  block: { title: string; subtitle: string };
  items: { id: string; icon: string; title: string; description: string; sortOrder: number }[];
}

@Injectable()
export class AdvantagesService {
  constructor(private prisma: PrismaService) {}

  async getData(baseUrl?: string): Promise<AdvantagesData> {
    const [block, items] = await Promise.all([
      this.prisma.advantagesBlock.findFirst({ where: { id: 'main' } }),
      this.prisma.advantageItem.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    const prefix = baseUrl ? baseUrl.replace(/\/$/, '') : '';

    return {
      block: block
        ? { title: block.title, subtitle: block.subtitle }
        : {
            title: 'Почему выбирают нас',
            subtitle: 'Мы делаем качество доступным',
          },
      items: items.map((item) => ({
        id: item.id,
        icon:
          item.icon.startsWith('http') || !item.icon.startsWith('/')
            ? item.icon
            : prefix
              ? `${prefix}${item.icon}`
              : item.icon,
        title: item.title,
        description: item.description,
        sortOrder: item.sortOrder,
      })),
    };
  }

  async updateBlock(data: { title?: string; subtitle?: string }) {
    return this.prisma.advantagesBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        title: data.title ?? 'Почему выбирают нас',
        subtitle: data.subtitle ?? 'Мы делаем качество доступным',
      },
      update: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
      },
    });
  }

  async uploadIcon(file: Express.Multer.File, baseUrl: string): Promise<{ icon: string }> {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const filename = path.basename(file.path);
    const iconUrl = `/uploads/advantages/icons/${filename}`;
    const prefix = baseUrl.replace(/\/$/, '');
    return { icon: `${prefix}${iconUrl}` };
  }

  async createItem(data: { icon: string; title: string; description: string }) {
    const count = await this.prisma.advantageItem.count();
    return this.prisma.advantageItem.create({
      data: { ...data, sortOrder: count },
    });
  }

  async updateItem(id: string, data: { icon?: string; title?: string; description?: string }) {
    const item = await this.prisma.advantageItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Преимущество не найдено');
    }
    return this.prisma.advantageItem.update({
      where: { id },
      data: {
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  }

  async deleteItem(id: string) {
    const item = await this.prisma.advantageItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Преимущество не найдено');
    }
    await this.prisma.advantageItem.delete({ where: { id } });
    return { success: true };
  }

  async reorderItems(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.advantageItem.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.prisma.advantageItem.findMany({ orderBy: { sortOrder: 'asc' } });
  }
}
