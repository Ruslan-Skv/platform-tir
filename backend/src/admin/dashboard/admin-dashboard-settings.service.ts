import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateAdminDashboardSettingsDto } from './dto/update-admin-dashboard-settings.dto';

const SETTINGS_ID = 'main';
const MAX_QUICK_LINKS = 20;

export const DEFAULT_ADMIN_DASHBOARD_QUICK_LINKS = [
  { label: 'Территория знаний', href: '/admin/knowledge' },
  { label: 'Каталог товаров', href: '/admin/catalog/products' },
  { label: 'Категории', href: '/admin/catalog/categories' },
  { label: 'Заказы', href: '/admin/orders' },
] as const;

export const DEFAULT_ADMIN_DASHBOARD_SETTINGS = {
  catalogActivityVisible: false,
  trainingDynamicsVisible: true,
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
  catalogActivityVisible: boolean;
  trainingDynamicsVisible: boolean;
  quickLinks: AdminDashboardQuickLinkRecord[];
};

@Injectable()
export class AdminDashboardSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<AdminDashboardSettingsRecord> {
    const row = await this.prisma.adminDashboardBlock.findUnique({
      where: { id: SETTINGS_ID },
      include: {
        quickLinks: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!row) {
      return {
        catalogActivityVisible: DEFAULT_ADMIN_DASHBOARD_SETTINGS.catalogActivityVisible,
        trainingDynamicsVisible: DEFAULT_ADMIN_DASHBOARD_SETTINGS.trainingDynamicsVisible,
        quickLinks: DEFAULT_ADMIN_DASHBOARD_QUICK_LINKS.map((link, index) => ({
          id: `default-${index}`,
          label: link.label,
          href: link.href,
          isEnabled: true,
          sortOrder: index,
        })),
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
      catalogActivityVisible: row.catalogActivityVisible,
      trainingDynamicsVisible: row.trainingDynamicsVisible,
      quickLinks,
    };
  }

  async updateSettings(dto: UpdateAdminDashboardSettingsDto) {
    if (dto.quickLinks && dto.quickLinks.length > MAX_QUICK_LINKS) {
      throw new BadRequestException(`Не более ${MAX_QUICK_LINKS} быстрых ссылок`);
    }

    return this.prisma.$transaction(async (tx) => {
      const block = await tx.adminDashboardBlock.upsert({
        where: { id: SETTINGS_ID },
        update: {
          ...(dto.catalogActivityVisible !== undefined && {
            catalogActivityVisible: dto.catalogActivityVisible,
          }),
          ...(dto.trainingDynamicsVisible !== undefined && {
            trainingDynamicsVisible: dto.trainingDynamicsVisible,
          }),
        },
        create: {
          id: SETTINGS_ID,
          catalogActivityVisible:
            dto.catalogActivityVisible ?? DEFAULT_ADMIN_DASHBOARD_SETTINGS.catalogActivityVisible,
          trainingDynamicsVisible:
            dto.trainingDynamicsVisible ?? DEFAULT_ADMIN_DASHBOARD_SETTINGS.trainingDynamicsVisible,
        },
      });

      if (dto.quickLinks !== undefined) {
        await tx.adminDashboardQuickLink.deleteMany({ where: { blockId: SETTINGS_ID } });
        if (dto.quickLinks.length > 0) {
          await tx.adminDashboardQuickLink.createMany({
            data: dto.quickLinks.map((link, index) => ({
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
        catalogActivityVisible: block.catalogActivityVisible,
        trainingDynamicsVisible: block.trainingDynamicsVisible,
        quickLinks: quickLinks.map((link) => ({
          id: link.id,
          label: link.label,
          href: link.href,
          isEnabled: link.isEnabled,
          sortOrder: link.sortOrder,
        })),
      };
    });
  }
}
