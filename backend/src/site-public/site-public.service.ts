import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UpdateSitePublicDto } from './dto/update-site-public.dto';
import { resolveAdminLinkRolesForPublic } from './admin-link-roles.util';

@Injectable()
export class SitePublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicConfig() {
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

  async getAdminSettings() {
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

  async updateAdminSettings(dto: UpdateSitePublicDto) {
    let jsonValue: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined = undefined;

    if (dto.rolesShowAdminLinkByDevice !== undefined) {
      if (dto.rolesShowAdminLinkByDevice === null) {
        jsonValue = Prisma.JsonNull;
      } else {
        const d = dto.rolesShowAdminLinkByDevice.desktop;
        const m = dto.rolesShowAdminLinkByDevice.mobile;
        if (d === null && m === null) {
          jsonValue = Prisma.JsonNull;
        } else {
          jsonValue = {
            desktop: d ?? null,
            mobile: m ?? null,
          };
        }
      }
    } else if (dto.rolesShowAdminLink !== undefined) {
      jsonValue =
        dto.rolesShowAdminLink === null
          ? Prisma.JsonNull
          : (dto.rolesShowAdminLink as Prisma.InputJsonValue);
    }

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
