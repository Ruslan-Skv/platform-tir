import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { resolveAdminLinkRolesForPublic } from './admin-link-roles.util';

@ApiTags('site-public')
@Controller('site-public')
export class SitePublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('config')
  @ApiOperation({ summary: 'Публичная конфигурация сайта (без авторизации)' })
  async getConfig() {
    const block = await this.prisma.sitePublicConfig.findUnique({
      where: { id: 'main' },
    });
    const raw = block?.rolesShowAdminLink;
    const { desktop, mobile } = resolveAdminLinkRolesForPublic(raw);
    return {
      rolesShowAdminLinkDesktop: desktop,
      rolesShowAdminLinkMobile: mobile,
      /** @deprecated Используйте rolesShowAdminLinkDesktop — то же значение для обратной совместимости. */
      rolesShowAdminLink: desktop,
    };
  }
}
