import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProductsCatalogQueryService } from '../products-catalog-query.service';
import {
  productCardBadgeSelectionsInclude,
  productCardVariantsInclude,
  productCreatedByUpdatedByInclude,
} from './products-includes';
import { stripProductForPublic, stripProductsForPublic } from '../utils/product-public.util';

@Injectable()
export class ProductsReadService {
  constructor(
    private prisma: PrismaService,
    private catalogQuery: ProductsCatalogQueryService,
  ) {}

  async findAll() {
    const rows = await this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return stripProductsForPublic(rows);
  }

  async findAllAdmin() {
    return this.prisma.product.findMany({
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        suppliers: {
          where: {
            isMainSupplier: true,
          },
          include: {
            supplier: {
              select: {
                id: true,
                legalName: true,
                commercialName: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSizesByCategoryId(categoryId: string): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where: {
        categoryId,
        sizes: { isEmpty: false },
      },
      select: { sizes: true },
    });
    const set = new Set<string>();
    for (const p of products) {
      for (const s of p.sizes) {
        const trimmed = s?.trim();
        if (trimmed) set.add(trimmed);
      }
    }
    return Array.from(set).sort();
  }

  /**
   * Уникальные значения атрибутов из товаров категории (подсказки datalist в форме товара).
   * По аналогии с подсказками полей в каталоге комплектующих — до 12 значений на slug.
   */
  async getAttributeValuesByCategoryId(categoryId: string): Promise<Record<string, string[]>> {
    const HINT_LIMIT = 12;
    const products = await this.prisma.product.findMany({
      where: { categoryId },
      select: { attributes: true },
    });

    const bySlug = new Map<string, Map<string, string>>();

    for (const product of products) {
      const attrs = product.attributes;
      if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) continue;

      for (const [slug, raw] of Object.entries(attrs as Record<string, unknown>)) {
        if (typeof raw !== 'string') continue;
        const trimmed = raw.trim();
        if (!trimmed) continue;
        // MULTI_SELECT хранится как JSON-массив — в подсказки свободного ввода не берём
        if (trimmed.startsWith('[')) continue;

        let values = bySlug.get(slug);
        if (!values) {
          values = new Map();
          bySlug.set(slug, values);
        }
        const key = trimmed.toLocaleLowerCase('ru-RU');
        if (!values.has(key)) values.set(key, trimmed);
      }
    }

    const result: Record<string, string[]> = {};
    for (const [slug, values] of bySlug) {
      result[slug] = Array.from(values.values())
        .sort((a, b) => a.localeCompare(b, 'ru'))
        .slice(0, HINT_LIMIT);
    }
    return result;
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
        },
        suppliers: {
          include: {
            supplier: {
              select: {
                id: true,
                legalName: true,
                commercialName: true,
              },
            },
          },
        },
        manufacturer: {
          select: { id: true, name: true, slug: true },
        },
        coatingMaterial: {
          select: { id: true, name: true, slug: true },
        },
        canvasType: {
          select: { id: true, name: true, slug: true },
        },
        doorThickness: {
          select: { id: true, name: true, slug: true },
        },
        weatherstrip: {
          select: { id: true, name: true, slug: true },
        },
        ...productCardVariantsInclude,
        ...productCardBadgeSelectionsInclude,
        ...productCreatedByUpdatedByInclude,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const [enriched] = await this.catalogQuery.enrichProductsWithRating([product]);
    return stripProductForPublic((enriched ?? product) as Record<string, unknown>);
  }

  async findManyActiveByIdsForCompare(ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 10);
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.prisma.product.findMany({
      where: { id: { in: unique }, isActive: true },
      include: this.catalogQuery.getCatalogPublicListInclude(),
    });
    const map = new Map(rows.map((p) => [p.id, p]));
    const ordered = unique.map((id) => map.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
    return stripProductsForPublic(await this.catalogQuery.enrichProductsWithRating(ordered));
  }

  async findManyActiveByIdsForWishlist(ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 500);
    if (unique.length === 0) {
      return [];
    }
    const rows = await this.prisma.product.findMany({
      where: { id: { in: unique }, isActive: true },
      include: this.catalogQuery.getCatalogPublicListInclude(),
    });
    const map = new Map(rows.map((p) => [p.id, p]));
    const ordered = unique.map((id) => map.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
    return stripProductsForPublic(await this.catalogQuery.enrichProductsWithRating(ordered));
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
        },
        ...productCardVariantsInclude,
        ...productCardBadgeSelectionsInclude,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug ${slug} not found`);
    }

    const [enriched] = await this.catalogQuery.enrichProductsWithRating([product]);
    return stripProductForPublic((enriched ?? product) as Record<string, unknown>);
  }
}
