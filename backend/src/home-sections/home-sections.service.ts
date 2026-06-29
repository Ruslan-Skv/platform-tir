import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateHomeSectionsDto } from './dto/update-home-sections.dto';

export const DEFAULT_HOME_SECTIONS_VISIBILITY = {
  heroVisible: true,
  heroMobileVisible: true,
  directionsVisible: true,
  directionsMobileVisible: true,
  advantagesVisible: true,
  advantagesMobileVisible: true,
  servicesVisible: true,
  servicesMobileVisible: true,
  featuredProductsVisible: true,
  featuredProductsMobileVisible: true,
  contactFormVisible: true,
  contactFormMobileVisible: true,
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
      heroMobileVisible: block.heroMobileVisible,
      directionsVisible: block.directionsVisible,
      directionsMobileVisible: block.directionsMobileVisible,
      advantagesVisible: block.advantagesVisible,
      advantagesMobileVisible: block.advantagesMobileVisible,
      servicesVisible: block.servicesVisible,
      servicesMobileVisible: block.servicesMobileVisible,
      featuredProductsVisible: block.featuredProductsVisible,
      featuredProductsMobileVisible: block.featuredProductsMobileVisible,
      contactFormVisible: block.contactFormVisible,
      contactFormMobileVisible: block.contactFormMobileVisible,
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
        ...(dto.heroMobileVisible !== undefined && { heroMobileVisible: dto.heroMobileVisible }),
        ...(dto.directionsVisible !== undefined && {
          directionsVisible: dto.directionsVisible,
        }),
        ...(dto.directionsMobileVisible !== undefined && {
          directionsMobileVisible: dto.directionsMobileVisible,
        }),
        ...(dto.advantagesVisible !== undefined && {
          advantagesVisible: dto.advantagesVisible,
        }),
        ...(dto.advantagesMobileVisible !== undefined && {
          advantagesMobileVisible: dto.advantagesMobileVisible,
        }),
        ...(dto.servicesVisible !== undefined && {
          servicesVisible: dto.servicesVisible,
        }),
        ...(dto.servicesMobileVisible !== undefined && {
          servicesMobileVisible: dto.servicesMobileVisible,
        }),
        ...(dto.featuredProductsVisible !== undefined && {
          featuredProductsVisible: dto.featuredProductsVisible,
        }),
        ...(dto.featuredProductsMobileVisible !== undefined && {
          featuredProductsMobileVisible: dto.featuredProductsMobileVisible,
        }),
        ...(dto.contactFormVisible !== undefined && {
          contactFormVisible: dto.contactFormVisible,
        }),
        ...(dto.contactFormMobileVisible !== undefined && {
          contactFormMobileVisible: dto.contactFormMobileVisible,
        }),
      },
      create: {
        id: 'main',
        heroVisible: dto.heroVisible ?? true,
        heroMobileVisible: dto.heroMobileVisible ?? dto.heroVisible ?? true,
        directionsVisible: dto.directionsVisible ?? true,
        directionsMobileVisible: dto.directionsMobileVisible ?? dto.directionsVisible ?? true,
        advantagesVisible: dto.advantagesVisible ?? true,
        advantagesMobileVisible: dto.advantagesMobileVisible ?? dto.advantagesVisible ?? true,
        servicesVisible: dto.servicesVisible ?? true,
        servicesMobileVisible: dto.servicesMobileVisible ?? dto.servicesVisible ?? true,
        featuredProductsVisible: dto.featuredProductsVisible ?? true,
        featuredProductsMobileVisible:
          dto.featuredProductsMobileVisible ?? dto.featuredProductsVisible ?? true,
        contactFormVisible: dto.contactFormVisible ?? true,
        contactFormMobileVisible: dto.contactFormMobileVisible ?? dto.contactFormVisible ?? true,
      },
    });
  }
}
