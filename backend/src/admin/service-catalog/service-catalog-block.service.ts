import { Injectable } from '@nestjs/common';
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
    return this.prisma.serviceCatalogBlock.update({
      where: { id: 'main' },
      data: dto,
    });
  }
}
