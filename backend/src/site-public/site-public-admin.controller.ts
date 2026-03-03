import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../database/prisma.service';
import { UpdateSitePublicDto } from './dto/update-site-public.dto';

@ApiTags('admin/site-public')
@Controller('admin/site-public')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@ApiBearerAuth()
export class SitePublicAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Настройки публичного сайта (супер-админ)' })
  async getSettings() {
    const block = await this.prisma.sitePublicConfig.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return this.prisma.sitePublicConfig.create({
        data: {
          id: 'main',
          rolesShowAdminLink: Prisma.JsonNull,
        },
      });
    }
    return block;
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Обновить настройки (супер-админ)' })
  async updateSettings(@Body() dto: UpdateSitePublicDto) {
    const jsonValue =
      dto.rolesShowAdminLink === undefined
        ? undefined
        : dto.rolesShowAdminLink === null
          ? Prisma.JsonNull
          : dto.rolesShowAdminLink;
    return this.prisma.sitePublicConfig.upsert({
      where: { id: 'main' },
      update: {
        ...(jsonValue !== undefined && { rolesShowAdminLink: jsonValue }),
      },
      create: {
        id: 'main',
        rolesShowAdminLink: jsonValue ?? Prisma.JsonNull,
      },
    });
  }
}
