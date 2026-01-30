import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type PrimaryFilter = 'featured' | 'new' | 'featured_or_new' | 'any';
export type SecondaryOrder = 'sort_order' | 'created_desc';

export interface FeaturedProductsBlockData {
  title: string;
  subtitle: string;
  limit: number;
  primaryFilter: PrimaryFilter;
  secondaryOrder: SecondaryOrder;
}

@Injectable()
export class FeaturedProductsService {
  constructor(private prisma: PrismaService) {}

  async getBlock(): Promise<FeaturedProductsBlockData> {
    const block = await this.prisma.featuredProductsBlock.findFirst({
      where: { id: 'main' },
    });

    const primaryFilter = (block?.primaryFilter ?? 'featured') as PrimaryFilter;
    const secondaryOrder = (block?.secondaryOrder ?? 'sort_order') as SecondaryOrder;

    return block
      ? {
          title: block.title,
          subtitle: block.subtitle,
          limit: block.limit,
          primaryFilter,
          secondaryOrder,
        }
      : {
          title: 'Популярные товары',
          subtitle: 'Товары, которые выбирают наши клиенты',
          limit: 8,
          primaryFilter: 'featured' as PrimaryFilter,
          secondaryOrder: 'sort_order' as SecondaryOrder,
        };
  }

  async updateBlock(data: {
    title?: string;
    subtitle?: string;
    limit?: number;
    primaryFilter?: PrimaryFilter;
    secondaryOrder?: SecondaryOrder;
  }) {
    return this.prisma.featuredProductsBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        title: data.title ?? 'Популярные товары',
        subtitle: data.subtitle ?? 'Товары, которые выбирают наши клиенты',
        limit: data.limit ?? 8,
        primaryFilter: data.primaryFilter ?? 'featured',
        secondaryOrder: data.secondaryOrder ?? 'sort_order',
      },
      update: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
        ...(data.limit !== undefined && { limit: data.limit }),
        ...(data.primaryFilter !== undefined && { primaryFilter: data.primaryFilter }),
        ...(data.secondaryOrder !== undefined && { secondaryOrder: data.secondaryOrder }),
      },
    });
  }
}
