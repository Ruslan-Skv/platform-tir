import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateHomeSectionsDto } from './dto/update-home-sections.dto';

const DEFAULT_VISIBILITY = {
  heroVisible: true,
  directionsVisible: true,
  advantagesVisible: true,
  servicesVisible: true,
  featuredProductsVisible: true,
  contactFormVisible: true,
};

@ApiTags('home-sections')
@Controller('home/sections')
export class HomeSectionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Получить настройки видимости секций главной страницы (публичный)' })
  async getVisibility() {
    const block = await this.prisma.homePageSectionsBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return DEFAULT_VISIBILITY;
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
}

@ApiTags('admin/home-sections')
@Controller('admin/home/sections')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminHomeSectionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Получить настройки видимости секций (админ)' })
  async getVisibility() {
    const block = await this.prisma.homePageSectionsBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return DEFAULT_VISIBILITY;
    }
    return block;
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить видимость секций главной страницы' })
  async updateVisibility(@Body() dto: UpdateHomeSectionsDto) {
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
