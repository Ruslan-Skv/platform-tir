import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SiteDecoration } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UpdateSiteDecorationDto } from './dto/update-site-decoration.dto';
import { UpdateSitePublicDto } from './dto/update-site-public.dto';
import { resolveAdminLinkRolesForPublic } from './admin-link-roles.util';
import {
  findSiteDecorationDefinition,
  resolveSiteDecorationVariant,
  SITE_DECORATIONS,
} from './site-decorations.registry';

@Injectable()
export class SitePublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicConfig() {
    const [block, decorationRows] = await Promise.all([
      this.prisma.sitePublicConfig.findUnique({
        where: { id: 'main' },
      }),
      this.prisma.siteDecoration.findMany({ where: { isActive: true } }),
    ]);
    const raw = block?.rolesShowAdminLink;
    const { desktop, mobile } = resolveAdminLinkRolesForPublic(raw);
    return {
      rolesShowAdminLinkDesktop: desktop,
      rolesShowAdminLinkMobile: mobile,
      /** @deprecated Используйте rolesShowAdminLinkDesktop — то же значение для обратной совместимости. */
      rolesShowAdminLink: desktop,
      headerVariant: block?.headerVariant === 'sticky' ? 'sticky' : 'classic',
      /** Активные украшения публичного сайта; период показа публичка проверяет на клиенте. */
      decorations: decorationRows.map((row) => ({
        code: row.code,
        startsAt: row.startsAt?.toISOString() ?? null,
        endsAt: row.endsAt?.toISOString() ?? null,
        variant: resolveSiteDecorationVariant(row.code, row.variant),
      })),
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
        ...(dto.headerVariant !== undefined && { headerVariant: dto.headerVariant }),
      },
      create: {
        id: 'main',
        rolesShowAdminLink: jsonValue ?? Prisma.JsonNull,
        ...(dto.headerVariant !== undefined && { headerVariant: dto.headerVariant }),
      },
    });
  }

  /** Список украшений для админки: строки из реестра создаются при первом чтении. */
  async listAdminDecorations() {
    await this.prisma.$transaction(
      SITE_DECORATIONS.map((definition) =>
        this.prisma.siteDecoration.upsert({
          where: { code: definition.code },
          update: {},
          create: { code: definition.code },
        }),
      ),
    );
    const rows = await this.prisma.siteDecoration.findMany({
      where: { code: { in: SITE_DECORATIONS.map((definition) => definition.code) } },
      orderBy: { code: 'asc' },
    });
    return rows.flatMap((row) => {
      const definition = findSiteDecorationDefinition(row.code);
      if (!definition) return [];
      return [this.toAdminDecoration(row, definition)];
    });
  }

  async updateAdminDecoration(code: string, dto: UpdateSiteDecorationDto) {
    const definition = findSiteDecorationDefinition(code);
    if (!definition) {
      throw new NotFoundException(`Украшение «${code}» не найдено`);
    }

    const startsAt =
      dto.startsAt === undefined || dto.startsAt === null ? null : new Date(dto.startsAt);
    const endsAt = dto.endsAt === undefined || dto.endsAt === null ? null : new Date(dto.endsAt);
    if (startsAt && endsAt && startsAt > endsAt) {
      throw new BadRequestException('Начало периода показа не может быть позже конца');
    }

    let variant: string | null | undefined;
    if (dto.variant !== undefined) {
      variant = resolveSiteDecorationVariant(code, dto.variant);
      if (dto.variant !== null && variant !== dto.variant) {
        throw new BadRequestException(
          `Вариант «${dto.variant}» не поддерживается украшением «${code}»`,
        );
      }
    }

    const row = await this.prisma.siteDecoration.upsert({
      where: { code },
      update: {
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.startsAt !== undefined && { startsAt }),
        ...(dto.endsAt !== undefined && { endsAt }),
        ...(variant !== undefined && { variant }),
      },
      create: {
        code,
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.startsAt !== undefined && { startsAt }),
        ...(dto.endsAt !== undefined && { endsAt }),
        ...(variant !== undefined && { variant }),
      },
    });
    return this.toAdminDecoration(row, definition);
  }

  private toAdminDecoration(
    row: SiteDecoration,
    definition: {
      title: string;
      description: string;
      variants?: readonly { value: string; label: string }[];
    },
  ) {
    return {
      code: row.code,
      title: definition.title,
      description: definition.description,
      isActive: row.isActive,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      /** Вариант из БД как есть; null = первый вариант реестра. */
      variant: row.variant,
      /** Доступные варианты из реестра (для радио-переключателя в админке). */
      variants: definition.variants ?? [],
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
