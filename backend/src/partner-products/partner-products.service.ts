import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface PartnerProductsBlockData {
  partnerLogoUrl: string | null;
  showPartnerIconOnCards: boolean;
}

@Injectable()
export class PartnerProductsService {
  constructor(private prisma: PrismaService) {}

  async getBlock(): Promise<PartnerProductsBlockData> {
    const block = await this.prisma.partnerProductsBlock.findFirst({
      where: { id: 'main' },
    });

    return block
      ? {
          partnerLogoUrl: block.partnerLogoUrl,
          showPartnerIconOnCards: block.showPartnerIconOnCards,
        }
      : {
          partnerLogoUrl: null,
          showPartnerIconOnCards: true,
        };
  }

  async updateBlock(data: { partnerLogoUrl?: string | null; showPartnerIconOnCards?: boolean }) {
    return this.prisma.partnerProductsBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        partnerLogoUrl: data.partnerLogoUrl ?? null,
        showPartnerIconOnCards: data.showPartnerIconOnCards ?? true,
      },
      update: {
        ...(data.partnerLogoUrl !== undefined && { partnerLogoUrl: data.partnerLogoUrl }),
        ...(data.showPartnerIconOnCards !== undefined && {
          showPartnerIconOnCards: data.showPartnerIconOnCards,
        }),
      },
    });
  }
}
