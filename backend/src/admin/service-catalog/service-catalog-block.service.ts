import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UpdateServiceCatalogBlockDto } from './dto/update-service-catalog-block.dto';

@Injectable()
export class ServiceCatalogBlockService {
  constructor(private prisma: PrismaService) {}

  async getBlock() {
    let block = await this.prisma.serviceCatalogBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      block = await this.prisma.serviceCatalogBlock.create({
        data: {
          id: 'main',
          title: 'Ремонт квартир',
          showPricesInPublic: true,
        },
      });
    }
    return block;
  }

  async updateBlock(dto: UpdateServiceCatalogBlockDto) {
    await this.getBlock();
    const { heroNotes, steps, ...rest } = dto;
    return this.prisma.serviceCatalogBlock.update({
      where: { id: 'main' },
      data: {
        ...rest,
        // Json-поля: явный null задаётся через Prisma.JsonNull
        ...(heroNotes !== undefined && {
          heroNotes:
            heroNotes === null ? Prisma.JsonNull : (heroNotes as unknown as Prisma.InputJsonValue),
        }),
        ...(steps !== undefined && {
          steps: steps === null ? Prisma.JsonNull : (steps as unknown as Prisma.InputJsonValue),
        }),
      },
    });
  }
}
