import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateHomeSectionsDto } from './dto/update-home-sections.dto';

export const DEFAULT_HOME_SECTIONS_VISIBILITY = {
  heroVisible: true,
  directionsVisible: true,
  advantagesVisible: true,
  servicesVisible: true,
  featuredProductsVisible: true,
  contactFormVisible: true,
};

@Injectable()
export class HomeSectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicVisibility() {
    const block = await this.prisma.homePageSectionsBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return DEFAULT_HOME_SECTIONS_VISIBILITY;
    }
    return {
      heroVisible: block.heroVisible,
      directionsVisible: block.directionsVisible,
      advantagesVisible: block.advantagesVisible,
      servicesVisible: block.servicesVisible,
      featuredProductsVisible: block.featuredProductsVisible,
      contactFormVisible: block.contactFormVisible,
    };
  }

  async getAdminVisibility() {
    const block = await this.prisma.homePageSectionsBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return DEFAULT_HOME_SECTIONS_VISIBILITY;
    }
    return block;
  }

  async updateVisibility(dto: UpdateHomeSectionsDto) {
    return this.prisma.homePageSectionsBlock.upsert({
      where: { id: 'main' },
      update: {
        ...(dto.heroVisible !== undefined && { heroVisible: dto.heroVisible }),
        ...(dto.directionsVisible !== undefined && {
          directionsVisible: dto.directionsVisible,
        }),
        ...(dto.advantagesVisible !== undefined && {
          advantagesVisible: dto.advantagesVisible,
        }),
        ...(dto.servicesVisible !== undefined && {
          servicesVisible: dto.servicesVisible,
        }),
        ...(dto.featuredProductsVisible !== undefined && {
          featuredProductsVisible: dto.featuredProductsVisible,
        }),
        ...(dto.contactFormVisible !== undefined && {
          contactFormVisible: dto.contactFormVisible,
        }),
      },
      create: {
        id: 'main',
        heroVisible: dto.heroVisible ?? true,
        directionsVisible: dto.directionsVisible ?? true,
        advantagesVisible: dto.advantagesVisible ?? true,
        servicesVisible: dto.servicesVisible ?? true,
        featuredProductsVisible: dto.featuredProductsVisible ?? true,
        contactFormVisible: dto.contactFormVisible ?? true,
      },
    });
  }
}
