import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CatalogBlockService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const block = await this.prisma.catalogBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return this.prisma.catalogBlock.create({
        data: {
          id: 'main',
          defaultMobileCatalogColumns: 1,
        },
      });
    }
    return block;
  }

  async updateSettings(data: { defaultMobileCatalogColumns?: 1 | 2 }) {
    return this.prisma.catalogBlock.upsert({
      where: { id: 'main' },
      update: {
        ...(data.defaultMobileCatalogColumns !== undefined && {
          defaultMobileCatalogColumns: data.defaultMobileCatalogColumns,
        }),
      },
      create: {
        id: 'main',
        defaultMobileCatalogColumns: data.defaultMobileCatalogColumns ?? 1,
      },
    });
  }
}
