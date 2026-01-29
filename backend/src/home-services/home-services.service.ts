import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface ServicesData {
  block: { title: string; subtitle: string };
  items: {
    id: string;
    title: string;
    description: string;
    features: string[];
    price: string;
    imageUrl: string | null;
    sortOrder: number;
  }[];
}

interface ServicesBlockRow {
  id: string;
  title: string;
  subtitle: string;
}

export interface ServiceItemRow {
  id: string;
  title: string;
  description: string;
  features: string[];
  price: string;
  imageUrl: string | null;
  sortOrder: number;
}

@Injectable()
export class HomeServicesService {
  constructor(private prisma: PrismaService) {}

  async getData(baseUrl?: string): Promise<ServicesData> {
    const [blockRows, itemRows] = await Promise.all([
      this.prisma.$queryRaw<ServicesBlockRow[]>`
        SELECT id, title, subtitle FROM services_block WHERE id = 'main' LIMIT 1
      `,
      this.prisma.$queryRaw<ServiceItemRow[]>`
        SELECT id, title, description, features, price, "imageUrl", "sortOrder"
        FROM service_items ORDER BY "sortOrder" ASC
      `,
    ]);

    const block = blockRows[0] ?? null;
    const items = itemRows ?? [];

    const prefix = baseUrl ? baseUrl.replace(/\/$/, '') : '';

    return {
      block: block
        ? { title: block.title, subtitle: block.subtitle }
        : {
            title: 'Комплексные решения',
            subtitle: 'Полный цикл услуг для вашего комфорта',
          },
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        features: item.features ?? [],
        price: item.price,
        imageUrl: item.imageUrl
          ? item.imageUrl.startsWith('http')
            ? item.imageUrl
            : prefix
              ? `${prefix}${item.imageUrl}`
              : item.imageUrl
          : null,
        sortOrder: item.sortOrder,
      })),
    };
  }

  async updateBlock(data: { title?: string; subtitle?: string }) {
    const blockRows = await this.prisma.$queryRaw<ServicesBlockRow[]>`
      SELECT id FROM services_block WHERE id = 'main' LIMIT 1
    `;

    const title = data.title ?? 'Комплексные решения';
    const subtitle = data.subtitle ?? 'Полный цикл услуг для вашего комфорта';

    if (blockRows.length === 0) {
      await this.prisma.$executeRaw`
        INSERT INTO services_block (id, title, subtitle, "updatedAt")
        VALUES ('main', ${title}, ${subtitle}, NOW())
      `;
    } else {
      const updates: Prisma.Sql[] = [];
      if (data.title !== undefined) {
        updates.push(Prisma.sql`title = ${data.title}`);
      }
      if (data.subtitle !== undefined) {
        updates.push(Prisma.sql`subtitle = ${data.subtitle}`);
      }
      if (updates.length > 0) {
        await this.prisma.$executeRaw`
          UPDATE services_block SET ${Prisma.join(updates, ', ')}, "updatedAt" = NOW() WHERE id = 'main'
        `;
      }
    }

    return { id: 'main', title, subtitle };
  }

  async uploadImage(file: Express.Multer.File, baseUrl: string): Promise<{ imageUrl: string }> {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const filename = path.basename(file.path);
    const imageUrl = `/uploads/services/images/${filename}`;
    const prefix = baseUrl.replace(/\/$/, '');
    return { imageUrl: `${prefix}${imageUrl}` };
  }

  async createItem(data: {
    title: string;
    description: string;
    features: string[];
    price: string;
    imageUrl?: string;
  }) {
    const countResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM service_items
    `;
    const count = Number(countResult[0]?.count ?? 0);
    const id = randomUUID();

    await this.prisma.$executeRaw`
      INSERT INTO service_items (id, title, description, features, price, "imageUrl", "sortOrder", "createdAt")
      VALUES (${id}, ${data.title}, ${data.description}, ${data.features}::text[], ${data.price}, ${data.imageUrl ?? null}, ${count}, NOW())
    `;

    const rows = await this.prisma.$queryRaw<ServiceItemRow[]>`
      SELECT id, title, description, features, price, "imageUrl", "sortOrder"
      FROM service_items WHERE id = ${id}
    `;
    return rows[0];
  }

  async updateItem(
    id: string,
    data: {
      title?: string;
      description?: string;
      features?: string[];
      price?: string;
      imageUrl?: string;
    },
  ) {
    const rows = await this.prisma.$queryRaw<ServiceItemRow[]>`
      SELECT id FROM service_items WHERE id = ${id} LIMIT 1
    `;
    if (rows.length === 0) {
      throw new NotFoundException('Услуга не найдена');
    }

    const updates: Prisma.Sql[] = [];
    if (data.title !== undefined) updates.push(Prisma.sql`title = ${data.title}`);
    if (data.description !== undefined) updates.push(Prisma.sql`description = ${data.description}`);
    if (data.features !== undefined) updates.push(Prisma.sql`features = ${data.features}::text[]`);
    if (data.price !== undefined) updates.push(Prisma.sql`price = ${data.price}`);
    if (data.imageUrl !== undefined) updates.push(Prisma.sql`"imageUrl" = ${data.imageUrl}`);

    if (updates.length > 0) {
      await this.prisma.$executeRaw`
        UPDATE service_items SET ${Prisma.join(updates, ', ')} WHERE id = ${id}
      `;
    }

    const result = await this.prisma.$queryRaw<ServiceItemRow[]>`
      SELECT id, title, description, features, price, "imageUrl", "sortOrder"
      FROM service_items WHERE id = ${id}
    `;
    return result[0];
  }

  async deleteItem(id: string) {
    const rows = await this.prisma.$queryRaw<ServiceItemRow[]>`
      SELECT id FROM service_items WHERE id = ${id} LIMIT 1
    `;
    if (rows.length === 0) {
      throw new NotFoundException('Услуга не найдена');
    }

    await this.prisma.$executeRaw`DELETE FROM service_items WHERE id = ${id}`;
    return { success: true };
  }

  async reorderItems(ids: string[]) {
    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.$executeRaw`
          UPDATE service_items SET "sortOrder" = ${i} WHERE id = ${ids[i]}
        `;
      }
    });

    const rows = await this.prisma.$queryRaw<ServiceItemRow[]>`
      SELECT id, title, description, features, price, "imageUrl", "sortOrder"
      FROM service_items ORDER BY "sortOrder" ASC
    `;
    return rows;
  }
}
