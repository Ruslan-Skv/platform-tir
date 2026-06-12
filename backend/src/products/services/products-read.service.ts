import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProductsCatalogQueryService } from '../products-catalog-query.service';
import {
  productCardBadgeSelectionsInclude,
  productCardVariantsInclude,
  productCreatedByUpdatedByInclude,
} from './products-includes';

@Injectable()
export class ProductsReadService {
  constructor(
    private prisma: PrismaService,
    private catalogQuery: ProductsCatalogQueryService,
  ) {}

  async findAll() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
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
    return enriched ?? product;
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
    return this.catalogQuery.enrichProductsWithRating(ordered);
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
    return this.catalogQuery.enrichProductsWithRating(ordered);
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
    return enriched ?? product;
  }
}
