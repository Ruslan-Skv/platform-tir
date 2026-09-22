import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  DEFAULT_ADMIN_DASHBOARD_SECTION_ORDER,
  normalizeAdminDashboardSectionOrder,
  type AdminDashboardSectionId,
} from './admin-dashboard-section-order';
import { UpdateAdminDashboardSettingsDto } from './dto/update-admin-dashboard-settings.dto';
import { UpdateAdminDashboardRoleBlockDto } from './dto/update-admin-dashboard-role-block.dto';
import { UpdateAdminDashboardRoleQuickLinksDto } from './dto/update-admin-dashboard-role-quick-links.dto';

const SETTINGS_ID = 'main';
const MAX_QUICK_LINKS = 20;

export const DEFAULT_ADMIN_DASHBOARD_QUICK_LINKS = [
  { label: 'Территория знаний', href: '/admin/knowledge' },
  { label: 'Каталог товаров', href: '/admin/catalog/products' },
  { label: 'Категории', href: '/admin/catalog/categories' },
  { label: 'Заказы', href: '/admin/orders' },
] as const;

export const DEFAULT_ADMIN_DASHBOARD_SETTINGS = {
  sectionOrder: [...DEFAULT_ADMIN_DASHBOARD_SECTION_ORDER],
  quickLinks: [...DEFAULT_ADMIN_DASHBOARD_QUICK_LINKS],
} as const;

export type AdminDashboardQuickLinkRecord = {
  id: string;
  label: string;
  href: string;
  isEnabled: boolean;
  sortOrder: number;
};

export type AdminDashboardSettingsRecord = {
  salesMonthVisible: boolean;
  catalogActivityVisible: boolean;
  trainingDynamicsVisible: boolean;
  calendarVisible: boolean;
  dateToolbarVisible: boolean;
  sectionOrder: AdminDashboardSectionId[];
  quickLinks: AdminDashboardQuickLinkRecord[];
  /** Доступность блоков для роли запросившего (задаёт супер-админ). */
  allowedBlocks: AdminDashboardRoleAllowed;
};

/** Доступность блоков дашборда для роли: false — блок роли запрещён. */
export type AdminDashboardRoleAllowed = {
  salesMonth: boolean;
  trainingDynamics: boolean;
  catalogActivity: boolean;
  calendar: boolean;
  quickLinks: boolean;
  dateToolbar: boolean;
};

export type AdminDashboardRoleAllowedRecord = AdminDashboardRoleAllowed & {
  role: string;
};

export type AdminDashboardRoleQuickLinkRecord = {
  role: string;
  linkId: string;
  allowed: boolean;
};

export const DEFAULT_ADMIN_DASHBOARD_ROLE_ALLOWED: AdminDashboardRoleAllowed = {
  salesMonth: true,
  trainingDynamics: true,
  catalogActivity: true,
  calendar: true,
  quickLinks: true,
  dateToolbar: true,
};

@Injectable()
export class AdminDashboardSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Доступность блоков для роли. SUPER_ADMIN не ограничивается. */
  async getRoleAllowed(role: string | null | undefined): Promise<AdminDashboardRoleAllowed> {
    if (!role || role === 'SUPER_ADMIN') {
      return { ...DEFAULT_ADMIN_DASHBOARD_ROLE_ALLOWED };
    }
    const row = await this.prisma.adminDashboardRoleBlock.findUnique({ where: { role } });
    if (!row) return { ...DEFAULT_ADMIN_DASHBOARD_ROLE_ALLOWED };
    return {
      salesMonth: row.salesMonthAllowed,
      trainingDynamics: row.trainingDynamicsAllowed,
      catalogActivity: row.catalogActivityAllowed,
      calendar: row.calendarAllowed,
      quickLinks: row.quickLinksAllowed,
      dateToolbar: row.dateToolbarAllowed,
    };
  }

  /** Все заданные ограничения по ролям (для модалки супер-админа). */
  async getRoleBlocks(): Promise<AdminDashboardRoleAllowedRecord[]> {
    const rows = await this.prisma.adminDashboardRoleBlock.findMany({
      orderBy: { role: 'asc' },
    });
    return rows.map((row) => ({
      role: row.role,
      salesMonth: row.salesMonthAllowed,
      trainingDynamics: row.trainingDynamicsAllowed,
      catalogActivity: row.catalogActivityAllowed,
      calendar: row.calendarAllowed,
      quickLinks: row.quickLinksAllowed,
      dateToolbar: row.dateToolbarAllowed,
    }));
  }

  async updateRoleBlock(dto: UpdateAdminDashboardRoleBlockDto) {
    const existing = await this.prisma.adminDashboardRoleBlock.findUnique({
      where: { role: dto.role },
    });
    const base = existing
      ? {
          salesMonthAllowed: existing.salesMonthAllowed,
          trainingDynamicsAllowed: existing.trainingDynamicsAllowed,
          catalogActivityAllowed: existing.catalogActivityAllowed,
          calendarAllowed: existing.calendarAllowed,
          quickLinksAllowed: existing.quickLinksAllowed,
          dateToolbarAllowed: existing.dateToolbarAllowed,
        }
      : { ...DEFAULT_ADMIN_DASHBOARD_ROLE_ALLOWED };
    const row = await this.prisma.adminDashboardRoleBlock.upsert({
      where: { role: dto.role },
      update: {
        ...(dto.salesMonth !== undefined && { salesMonthAllowed: dto.salesMonth }),
        ...(dto.trainingDynamics !== undefined && {
          trainingDynamicsAllowed: dto.trainingDynamics,
        }),
        ...(dto.catalogActivity !== undefined && { catalogActivityAllowed: dto.catalogActivity }),
        ...(dto.calendar !== undefined && { calendarAllowed: dto.calendar }),
        ...(dto.quickLinks !== undefined && { quickLinksAllowed: dto.quickLinks }),
        ...(dto.dateToolbar !== undefined && { dateToolbarAllowed: dto.dateToolbar }),
      },
      create: {
        role: dto.role,
        salesMonthAllowed: dto.salesMonth ?? base.salesMonthAllowed,
        trainingDynamicsAllowed: dto.trainingDynamics ?? base.trainingDynamicsAllowed,
        catalogActivityAllowed: dto.catalogActivity ?? base.catalogActivityAllowed,
        calendarAllowed: dto.calendar ?? base.calendarAllowed,
        quickLinksAllowed: dto.quickLinks ?? base.quickLinksAllowed,
        dateToolbarAllowed: dto.dateToolbar ?? base.dateToolbarAllowed,
      },
    });
    return {
      role: row.role,
      salesMonth: row.salesMonthAllowed,
      trainingDynamics: row.trainingDynamicsAllowed,
      catalogActivity: row.catalogActivityAllowed,
      calendar: row.calendarAllowed,
      quickLinks: row.quickLinksAllowed,
      dateToolbar: row.dateToolbarAllowed,
    } satisfies AdminDashboardRoleAllowedRecord;
  }

  /** Доступность отдельных быстрых ссылок для роли (для модалки супер-админа). */
  async getRoleQuickLinks(): Promise<AdminDashboardRoleQuickLinkRecord[]> {
    const rows = await this.prisma.adminDashboardRoleQuickLink.findMany({
      orderBy: [{ role: 'asc' }, { linkId: 'asc' }],
    });
    return rows.map((row) => ({ role: row.role, linkId: row.linkId, allowed: row.allowed }));
  }

  async updateRoleQuickLinks(dto: UpdateAdminDashboardRoleQuickLinksDto) {
    const items = dto.items ?? [];
    if (items.length === 0) {
      return this.getRoleQuickLinks();
    }
    const linkIds = [...new Set(items.map((item) => item.linkId))];
    const links = await this.prisma.adminDashboardQuickLink.findMany({
      where: { id: { in: linkIds } },
      select: { id: true },
    });
    const knownIds = new Set(links.map((link) => link.id));
    const unknown = linkIds.filter((id) => !knownIds.has(id));
    if (unknown.length > 0) {
      throw new BadRequestException('Некоторые быстрые ссылки не найдены');
    }

    for (const item of items) {
      await this.prisma.adminDashboardRoleQuickLink.upsert({
        where: { role_linkId: { role: dto.role, linkId: item.linkId } },
        update: { allowed: item.allowed },
        create: { role: dto.role, linkId: item.linkId, allowed: item.allowed },
      });
    }

    const rows = await this.prisma.adminDashboardRoleQuickLink.findMany({
      where: { role: dto.role },
      orderBy: { linkId: 'asc' },
    });
    return rows.map((row) => ({ role: row.role, linkId: row.linkId, allowed: row.allowed }));
  }

  /** Идентификаторы ссылок, запрещённых для роли. */
  private async getBlockedQuickLinkIds(role: string | null | undefined): Promise<Set<string>> {
    if (!role || role === 'SUPER_ADMIN') return new Set();
    const rows = await this.prisma.adminDashboardRoleQuickLink.findMany({
      where: { role, allowed: false },
      select: { linkId: true },
    });
    return new Set(rows.map((row) => row.linkId));
  }

  async getSettings(role?: string | null): Promise<AdminDashboardSettingsRecord> {
    const allowed = await this.getRoleAllowed(role);
    const blockedLinkIds = await this.getBlockedQuickLinkIds(role);
    const row = await this.prisma.adminDashboardBlock.findUnique({
      where: { id: SETTINGS_ID },
      include: {
        quickLinks: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!row) {
      return {
        // Видимость блоков определяется только доступом роли (настраивает супер-админ)
        salesMonthVisible: allowed.salesMonth,
        catalogActivityVisible: allowed.catalogActivity,
        trainingDynamicsVisible: allowed.trainingDynamics,
        calendarVisible: allowed.calendar,
        dateToolbarVisible: allowed.dateToolbar,
        sectionOrder: [...DEFAULT_ADMIN_DASHBOARD_SETTINGS.sectionOrder],
        quickLinks: allowed.quickLinks
          ? DEFAULT_ADMIN_DASHBOARD_QUICK_LINKS.map((link, index) => ({
              id: `default-${index}`,
              label: link.label,
              href: link.href,
              isEnabled: true,
              sortOrder: index,
            }))
          : [],
        allowedBlocks: allowed,
      };
    }

    const quickLinks =
      row.quickLinks.length > 0
        ? row.quickLinks.map((link) => ({
            id: link.id,
            label: link.label,
            href: link.href,
            isEnabled: link.isEnabled,
            sortOrder: link.sortOrder,
          }))
        : DEFAULT_ADMIN_DASHBOARD_QUICK_LINKS.map((link, index) => ({
            id: `default-${index}`,
            label: link.label,
            href: link.href,
            isEnabled: true,
            sortOrder: index,
          }));

    return {
      // Видимость блоков определяется только доступом роли (настраивает супер-админ)
      salesMonthVisible: allowed.salesMonth,
      catalogActivityVisible: allowed.catalogActivity,
      trainingDynamicsVisible: allowed.trainingDynamics,
      calendarVisible: allowed.calendar,
      dateToolbarVisible: allowed.dateToolbar,
      sectionOrder: normalizeAdminDashboardSectionOrder(row.sectionOrder),
      quickLinks: allowed.quickLinks
        ? quickLinks.filter((link) => !blockedLinkIds.has(link.id))
        : [],
      allowedBlocks: allowed,
    };
  }

  async updateSettings(dto: UpdateAdminDashboardSettingsDto) {
    if (dto.quickLinks && dto.quickLinks.length > MAX_QUICK_LINKS) {
      throw new BadRequestException(`Не более ${MAX_QUICK_LINKS} быстрых ссылок`);
    }

    if (dto.sectionOrder !== undefined) {
      const normalized = normalizeAdminDashboardSectionOrder(dto.sectionOrder);
      if (normalized.length !== dto.sectionOrder.length) {
        throw new BadRequestException(
          'Порядок секций содержит дубликаты или неизвестные идентификаторы',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.adminDashboardBlock.upsert({
        where: { id: SETTINGS_ID },
        update: {
          ...(dto.sectionOrder !== undefined && {
            sectionOrder: normalizeAdminDashboardSectionOrder(dto.sectionOrder),
          }),
        },
        create: {
          id: SETTINGS_ID,
          sectionOrder:
            dto.sectionOrder !== undefined
              ? normalizeAdminDashboardSectionOrder(dto.sectionOrder)
              : [...DEFAULT_ADMIN_DASHBOARD_SETTINGS.sectionOrder],
        },
      });

      if (dto.quickLinks !== undefined) {
        await tx.adminDashboardQuickLink.deleteMany({ where: { blockId: SETTINGS_ID } });
        if (dto.quickLinks.length > 0) {
          await tx.adminDashboardQuickLink.createMany({
            data: dto.quickLinks.map((link, index) => ({
              // Сохраняем id существующих ссылок, чтобы не терялись доступы по ролям
              ...(link.id ? { id: link.id } : {}),
              blockId: SETTINGS_ID,
              label: link.label.trim(),
              href: link.href.trim(),
              isEnabled: link.isEnabled ?? true,
              sortOrder: index,
            })),
          });
        }
      }

      const quickLinks = await tx.adminDashboardQuickLink.findMany({
        where: { blockId: SETTINGS_ID },
        orderBy: { sortOrder: 'asc' },
      });

      return {
        sectionOrder: normalizeAdminDashboardSectionOrder(
          dto.sectionOrder ?? DEFAULT_ADMIN_DASHBOARD_SETTINGS.sectionOrder,
        ),
        quickLinks: quickLinks.map((link) => ({
          id: link.id,
          label: link.label,
          href: link.href,
          isEnabled: link.isEnabled,
          sortOrder: link.sortOrder,
        })),
      };
    });

    // Настройки сохраняет только SUPER_ADMIN — ограничений по роли нет.
    return this.getSettings('SUPER_ADMIN');
  }
}
