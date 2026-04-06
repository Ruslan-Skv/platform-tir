import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ProductCardBadgesService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefinitions() {
    return this.prisma.productCardBadgeDefinition.findMany({
      orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
    });
  }

  async setImageUrl(id: string, imageUrl: string | null) {
    await this.ensureDefinition(id);
    return this.prisma.productCardBadgeDefinition.update({
      where: { id },
      data: { imageUrl },
    });
  }

  async patchDefinition(
    id: string,
    data: { imageUrl?: string | null; description?: string | null },
  ) {
    const hasImage = 'imageUrl' in data;
    const hasDesc = 'description' in data;
    if (!hasImage && !hasDesc) {
      throw new BadRequestException('Укажите imageUrl и/или description');
    }
    await this.ensureDefinition(id);
    const update: Record<string, string | null | undefined> = {};
    if (hasImage) {
      update.imageUrl = data.imageUrl ?? null;
    }
    if (hasDesc) {
      const d = data.description;
      update.description = d === null || d === undefined ? null : String(d).trim() || null;
    }
    return this.prisma.productCardBadgeDefinition.update({
      where: { id },
      data: update as Prisma.ProductCardBadgeDefinitionUpdateInput,
    });
  }

  private async ensureDefinition(id: string) {
    const row = await this.prisma.productCardBadgeDefinition.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Бэйдж ${id} не найден`);
    }
  }
}
