import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CatalogFilterBlocksService } from '../../catalog-filter-blocks/catalog-filter-blocks.service';
import type {
  CatalogCategoryFilterOptionDto,
  CatalogFilterFacetDto,
} from '../../catalog-filter-blocks/dto/public-filters.dto';
import type { PublicCatalogListParams, PublicCatalogSort } from '../dto/public-catalog-list.dto';
import type { CatalogFilterRow, CategoryWithChildren } from './public-catalog-shared';

@Injectable()
export class PublicCatalogFiltersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogFilterBlocks: CatalogFilterBlocksService,
  ) {}

  async loadAttributeFacets(effectiveSlug: string): Promise<CatalogFilterFacetDto[]> {
    try {
      const block = await this.catalogFilterBlocks.getPublicFiltersByCategorySlug(effectiveSlug);
      return block.filters;
    } catch {
      return [];
    }
  }

  buildCategoryFilterOptionsFromRows(
    category: CategoryWithChildren,
    rows: CatalogFilterRow[],
  ): CatalogCategoryFilterOptionDto[] {
    // false — явно выключено в админке; true/undefined — показывать (в т.ч. до generate Prisma).
    if (category.showChildCategoryFilters === false) {
      return [];
    }

    const countDirect = new Map<string, number>();
    for (const row of rows) {
      const slug = row.category.slug;
      countDirect.set(slug, (countDirect.get(slug) ?? 0) + 1);
    }

    const collectSlugs = (cat: CategoryWithChildren): Set<string> => {
      const slugs = new Set<string>([cat.slug]);
      for (const child of cat.children ?? []) {
        for (const s of collectSlugs(child)) slugs.add(s);
      }
      return slugs;
    };

    const subtreeCount = (cat: CategoryWithChildren): number => {
      const slugs = collectSlugs(cat);
      return rows.filter((r) => slugs.has(r.category.slug)).length;
    };

    const walk = (cat: CategoryWithChildren, depth: 0 | 1): CatalogCategoryFilterOptionDto[] => {
      const out: CatalogCategoryFilterOptionDto[] = [];
      const count = depth === 0 ? subtreeCount(cat) : (countDirect.get(cat.slug) ?? 0);

      if (depth === 0) {
        if ((cat.children?.length ?? 0) > 0 || count > 0) {
          out.push({ slug: cat.slug, label: cat.name, count, depth });
        }
      } else if (count > 0) {
        out.push({ slug: cat.slug, label: cat.name, count, depth });
      }

      for (const child of cat.children ?? []) {
        out.push(...walk(child, 1));
      }
      return out;
    };

    const options = walk(category, 0);
    if (options.length <= 1) return [];

    const roots = options.filter((o) => o.depth === 0);
    const children = options
      .filter((o) => o.depth === 1)
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
    return [...roots, ...children];
  }

  filterRowsForList(
    rows: CatalogFilterRow[],
    params: PublicCatalogListParams,
    facets: CatalogFilterFacetDto[],
  ): CatalogFilterRow[] {
    return this.applyCrossFilters(rows, params, facets, {});
  }

  applyCrossFiltersForBlockItem(
    rows: CatalogFilterRow[],
    params: PublicCatalogListParams,
    facets: CatalogFilterFacetDto[],
    item: {
      kind: string;
      attribute?: { slug: string; name: string } | null;
    },
  ): CatalogFilterRow[] {
    const excludeAttributeSlug =
      item.kind === 'ATTRIBUTE' && item.attribute?.slug ? item.attribute.slug : undefined;

    return this.applyCrossFilters(rows, params, facets, {
      excludeMfr: item.kind === 'MANUFACTURER',
      excludeAvail: item.kind === 'STOCK',
      excludeAttributeSlug,
    });
  }

  applyCrossFilters(
    rows: CatalogFilterRow[],
    params: PublicCatalogListParams,
    facets: CatalogFilterFacetDto[],
    options: {
      excludeCat?: boolean;
      excludeMfr?: boolean;
      excludeAvail?: boolean;
      excludePrice?: boolean;
      excludeAttributeSlug?: string;
    },
  ): CatalogFilterRow[] {
    let result = rows;

    if (!options.excludeCat && params.cat?.length) {
      const allowed = new Set(params.cat);
      result = result.filter((p) => this.matchesCategoryCatFilter(p.category, allowed));
    }

    if (!options.excludeAvail && params.avail?.length) {
      const allowed = new Set(params.avail);
      result = result.filter((p) => allowed.has(this.getAvailability(p.stock, p.onOrder)));
    }

    if (!options.excludeMfr && params.mfr?.length) {
      const allowed = new Set(params.mfr.map((v) => v.trim()).filter(Boolean));
      result = result.filter((p) => this.matchesMfrFilter(p, allowed, facets));
    }

    if (!options.excludePrice && (params.priceMin !== undefined || params.priceMax !== undefined)) {
      result = result.filter((p) => {
        const price = Number(p.price);
        if (params.priceMin !== undefined && price < params.priceMin) return false;
        if (params.priceMax !== undefined && price > params.priceMax) return false;
        return true;
      });
    }

    if (params.attributes && Object.keys(params.attributes).length > 0) {
      result = result.filter((p) =>
        this.matchesAttributeFilters(p, params.attributes!, facets, options.excludeAttributeSlug),
      );
    }

    return result;
  }

  async sortFilterRows(
    rows: CatalogFilterRow[],
    sort: PublicCatalogSort,
    searchRelevanceOrder?: string[] | null,
  ) {
    if (sort === 'default' && searchRelevanceOrder?.length) {
      const rank = new Map(searchRelevanceOrder.map((id, index) => [id, index]));
      return [...rows].sort((a, b) => {
        const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    if (sort === 'rating') {
      const ratings = await this.loadRatingsMap(rows.map((r) => r.id));
      return [...rows].sort((a, b) => {
        const ra = ratings.get(a.id) ?? 0;
        const rb = ratings.get(b.id) ?? 0;
        if (rb !== ra) return rb - ra;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    return [...rows].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price.comparedTo(b.price);
        case 'price-desc':
          return b.price.comparedTo(a.price);
        case 'name-asc':
          return a.name.localeCompare(b.name, 'ru');
        case 'name-desc':
          return b.name.localeCompare(a.name, 'ru');
        case 'new':
          if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'default':
        default:
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
  }

  private matchesCategoryCatFilter(
    category: { slug: string; parent: { slug: string } | null },
    allowed: Set<string>,
  ): boolean {
    if (allowed.has(category.slug)) return true;
    const parentSlug = category.parent?.slug;
    return parentSlug != null && allowed.has(parentSlug);
  }

  private getAvailability(stock: number, onOrder: boolean): string {
    if (stock > 0) return 'in_stock';
    if (onOrder) return 'on_order';
    return 'out_of_stock';
  }

  private matchesMfrFilter(
    product: CatalogFilterRow,
    allowed: Set<string>,
    facets: CatalogFilterFacetDto[],
  ): boolean {
    if (product.manufacturerId && allowed.has(product.manufacturerId)) {
      return true;
    }
    const name = product.manufacturer?.name?.trim();
    if (name && allowed.has(name)) return true;
    const slug = product.manufacturer?.slug?.trim();
    if (slug && allowed.has(slug)) return true;

    const attrFacet = facets.find((f) => f.id === 'manufacturer' && f.attributeSlug);
    if (attrFacet?.attributeSlug) {
      const attrValue = this.catalogFilterBlocks.getAttrValueForFacetProduct(product, {
        slug: attrFacet.attributeSlug,
        name: attrFacet.attributeName ?? attrFacet.attributeSlug,
      });
      if (attrValue && allowed.has(attrValue.trim())) return true;
    }

    return false;
  }

  private matchesAttributeFilters(
    product: CatalogFilterRow,
    attributeFilters: Record<string, string[]>,
    facets: Array<{ id: string; attributeSlug?: string; attributeName?: string | null }>,
    excludeAttributeSlug?: string,
  ): boolean {
    for (const [filterId, selectedValues] of Object.entries(attributeFilters)) {
      if (selectedValues.length === 0) continue;
      const facet = facets.find((f) => f.id === filterId);
      const slug = facet?.attributeSlug ?? filterId;
      if (excludeAttributeSlug && slug === excludeAttributeSlug) {
        continue;
      }
      const name = facet?.attributeName ?? facet?.id ?? filterId;
      const value = this.catalogFilterBlocks.getAttrValueForFacetProduct(product, {
        slug,
        name,
      });
      if (value == null) return false;
      const normalizedValue = value.trim();
      const matches = selectedValues.some((v) => v.trim() === normalizedValue);
      if (!matches) {
        return false;
      }
    }
    return true;
  }

  private async loadRatingsMap(productIds: string[]): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();
    const agg = await this.prisma.review.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds }, isApproved: true },
      _avg: { rating: true },
    });
    return new Map(
      agg.map((a) => [a.productId, a._avg.rating ? Math.round(a._avg.rating * 10) / 10 : 0]),
    );
  }
}
