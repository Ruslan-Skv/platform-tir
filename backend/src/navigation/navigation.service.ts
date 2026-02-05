import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface NavigationItemDto {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
  hasDropdown: boolean;
  category: string | null;
}

@Injectable()
export class NavigationService {
  constructor(private prisma: PrismaService) {}

  async getItems(): Promise<NavigationItemDto[]> {
    const items = await this.prisma.navigationItem.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      href: item.href,
      sortOrder: item.sortOrder,
      hasDropdown: item.hasDropdown,
      category: item.category,
    }));
  }

  async createItem(data: {
    name: string;
    href: string;
    hasDropdown?: boolean;
    category?: string | null;
  }) {
    const count = await this.prisma.navigationItem.count();
    return this.prisma.navigationItem.create({
      data: {
        name: data.name,
        href: data.href || '#',
        hasDropdown: data.hasDropdown ?? false,
        category: data.category ?? null,
        sortOrder: count,
      },
    });
  }

  async updateItem(
    id: string,
    data: { name?: string; href?: string; hasDropdown?: boolean; category?: string | null },
  ) {
    const item = await this.prisma.navigationItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Пункт меню не найден');
    return this.prisma.navigationItem.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.href !== undefined && { href: data.href }),
        ...(data.hasDropdown !== undefined && { hasDropdown: data.hasDropdown }),
        ...(data.category !== undefined && { category: data.category ?? null }),
      },
    });
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
}
