import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface DropdownSubItemDto {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
}

export interface DropdownItemDto {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
  icon: string | null;
  submenu: DropdownSubItemDto[];
}

export interface NavigationItemDto {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
  hasDropdown: boolean;
  isActive?: boolean;
  dropdownItems?: DropdownItemDto[];
}

function mapSubItem(s: {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
}): DropdownSubItemDto {
  return { id: s.id, name: s.name, href: s.href, sortOrder: s.sortOrder };
}

function mapDropdownItem(d: {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
  icon: string | null;
  submenu: { id: string; name: string; href: string; sortOrder: number }[];
}): DropdownItemDto {
  return {
    id: d.id,
    name: d.name,
    href: d.href,
    sortOrder: d.sortOrder,
    icon: d.icon,
    submenu: d.submenu.map(mapSubItem),
  };
}

const navInclude = {
  dropdownItems: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      submenu: { orderBy: { sortOrder: 'asc' as const } },
    },
  },
};

@Injectable()
export class NavigationService {
  constructor(private prisma: PrismaService) {}

  /** Все пункты для админки с вложенными меню */
  async getItems(): Promise<NavigationItemDto[]> {
    const items = await this.prisma.navigationItem.findMany({
      orderBy: { sortOrder: 'asc' },
      include: navInclude,
    });
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      href: item.href,
      sortOrder: item.sortOrder,
      hasDropdown: item.hasDropdown,
      isActive: item.isActive,
      dropdownItems: item.dropdownItems.map(mapDropdownItem),
    }));
  }

  /** Только активные пункты для публичного меню, с вложенными пунктами */
  async getActiveItems(): Promise<NavigationItemDto[]> {
    const items = await this.prisma.navigationItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: navInclude,
    });
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      href: item.href,
      sortOrder: item.sortOrder,
      hasDropdown: item.hasDropdown,
      dropdownItems: item.dropdownItems.map(mapDropdownItem),
    }));
  }

  async createItem(data: {
    name: string;
    href: string;
    hasDropdown?: boolean;
    isActive?: boolean;
  }) {
    const count = await this.prisma.navigationItem.count();
    const created = await this.prisma.navigationItem.create({
      data: {
        name: data.name,
        href: data.href || '#',
        hasDropdown: data.hasDropdown ?? false,
        isActive: data.isActive ?? true,
        sortOrder: count,
      },
      include: navInclude,
    });
    return {
      id: created.id,
      name: created.name,
      href: created.href,
      sortOrder: created.sortOrder,
      hasDropdown: created.hasDropdown,
      isActive: created.isActive,
      dropdownItems: created.dropdownItems.map(mapDropdownItem),
    };
  }

  async updateItem(
    id: string,
    data: { name?: string; href?: string; hasDropdown?: boolean; isActive?: boolean },
  ) {
    const item = await this.prisma.navigationItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Пункт меню не найден');
    const updated = await this.prisma.navigationItem.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.href !== undefined && { href: data.href }),
        ...(data.hasDropdown !== undefined && { hasDropdown: data.hasDropdown }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: navInclude,
    });
    return {
      id: updated.id,
      name: updated.name,
      href: updated.href,
      sortOrder: updated.sortOrder,
      hasDropdown: updated.hasDropdown,
      isActive: updated.isActive,
      dropdownItems: updated.dropdownItems.map(mapDropdownItem),
    };
  }

  async deleteItem(id: string) {
    const item = await this.prisma.navigationItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Пункт меню не найден');
    await this.prisma.navigationItem.delete({ where: { id } });
    return { success: true };
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.navigationItem.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.getItems();
  }

  // --- Dropdown items (вложенное меню первого уровня) ---

  async createDropdownItem(
    navItemId: string,
    data: { name: string; href: string; icon?: string | null },
  ) {
    const navItem = await this.prisma.navigationItem.findUnique({ where: { id: navItemId } });
    if (!navItem) throw new NotFoundException('Пункт меню не найден');
    const count = await this.prisma.navigationDropdownItem.count({ where: { navItemId } });
    const created = await this.prisma.navigationDropdownItem.create({
      data: {
        navItemId,
        name: data.name,
        href: data.href || '#',
        icon: data.icon ?? null,
        sortOrder: count,
      },
      include: { submenu: { orderBy: { sortOrder: 'asc' } } },
    });
    return mapDropdownItem(created);
  }

  async updateDropdownItem(
    id: string,
    data: { name?: string; href?: string; icon?: string | null },
  ) {
    const item = await this.prisma.navigationDropdownItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Пункт выпадающего меню не найден');
    const updated = await this.prisma.navigationDropdownItem.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.href !== undefined && { href: data.href }),
        ...(data.icon !== undefined && { icon: data.icon ?? null }),
      },
      include: { submenu: { orderBy: { sortOrder: 'asc' } } },
    });
    return mapDropdownItem(updated);
  }

  async deleteDropdownItem(id: string) {
    const item = await this.prisma.navigationDropdownItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Пункт выпадающего меню не найден');
    await this.prisma.navigationDropdownItem.delete({ where: { id } });
    return { success: true };
  }

  async reorderDropdownItems(navItemId: string, ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.navigationDropdownItem.update({
          where: { id, navItemId },
          data: { sortOrder: index },
        }),
      ),
    );
    const navItem = await this.prisma.navigationItem.findUnique({
      where: { id: navItemId },
      include: navInclude,
    });
    if (!navItem) return [];
    return navItem.dropdownItems.map(mapDropdownItem);
  }

  // --- Submenu (вложенное меню второго уровня) ---

  async createSubItem(dropdownItemId: string, data: { name: string; href: string }) {
    const parent = await this.prisma.navigationDropdownItem.findUnique({
      where: { id: dropdownItemId },
    });
    if (!parent) throw new NotFoundException('Пункт выпадающего меню не найден');
    const count = await this.prisma.navigationDropdownSubItem.count({
      where: { dropdownId: dropdownItemId },
    });
    return this.prisma.navigationDropdownSubItem.create({
      data: {
        dropdownId: dropdownItemId,
        name: data.name,
        href: data.href || '#',
        sortOrder: count,
      },
    });
  }

  async updateSubItem(id: string, data: { name?: string; href?: string }) {
    const item = await this.prisma.navigationDropdownSubItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Подпункт не найден');
    return this.prisma.navigationDropdownSubItem.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.href !== undefined && { href: data.href }),
      },
    });
  }

  async deleteSubItem(id: string) {
    const item = await this.prisma.navigationDropdownSubItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Подпункт не найден');
    await this.prisma.navigationDropdownSubItem.delete({ where: { id } });
    return { success: true };
  }

  async reorderSubItems(dropdownItemId: string, ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.navigationDropdownSubItem.update({
          where: { id, dropdownId: dropdownItemId },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.prisma.navigationDropdownSubItem.findMany({
      where: { dropdownId: dropdownItemId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
