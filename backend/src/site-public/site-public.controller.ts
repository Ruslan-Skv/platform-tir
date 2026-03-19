import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';

/** По умолчанию кнопка «Админка» только у супер-админа. В админке можно добавить другие роли. */
const DEFAULT_ADMIN_LINK_ROLES = ['SUPER_ADMIN'];

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
    const rolesShowAdminLink =
      Array.isArray(raw) && raw.length > 0
        ? (raw as string[]).filter((r) => typeof r === 'string')
        : DEFAULT_ADMIN_LINK_ROLES;
    return { rolesShowAdminLink };
  }
}
