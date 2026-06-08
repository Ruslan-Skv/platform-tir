import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogFilterOptionsSort, Category, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateCatalogFilterBlockDto } from './dto/create-catalog-filter-block.dto';
import { UpdateCatalogFilterBlockDto } from './dto/update-catalog-filter-block.dto';
import { CatalogFilterFacetDto, CatalogFiltersResponseDto } from './dto/public-filters.dto';
import { CatalogFilterBlockItemInputDto } from './dto/catalog-filter-block-item.dto';

type CategoryWithChildren = Category & { children?: CategoryWithChildren[] };

@Injectable()
export class CatalogFilterBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Значение атрибута из JSON товара (совместимо с публичным фронтом). */
  /**
   * Значение для фасета «атрибут»: из JSON товара или из справочника (толщина / уплотнитель),
   * если в карточке заданы FK и в JSON значения нет.
   */
  getAttrValueForFacetProduct(
    p: {
      attributes: unknown;
      doorThickness?: { name: string } | null;
      weatherstrip?: { name: string } | null;
    },
    meta: { slug: string; name: string },
  ): string | null {
    const fromJson = this.getAttrValueFromProductJson(p.attributes, meta);
    if (fromJson) return fromJson;
    if (meta.slug === 'door-thickness' && p.doorThickness?.name) {
      return p.doorThickness.name.trim();
    }
    if (meta.slug === 'weatherstrip' && p.weatherstrip?.name) {
      return p.weatherstrip.name.trim();
    }
    return null;
  }

  /** Первое число в строке значения (например «40 мм», «12,5 см»). */
  private parseLeadingNumber(value: string): number | null {
    const normalized = value.replace(/\s/g, ' ').replace(',', '.');
    const m = normalized.match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  private compareFacetValuesNumericDescThenLocale(a: string, b: string): number {
    const na = this.parseLeadingNumber(a);
    const nb = this.parseLeadingNumber(b);
    if (na != null && nb != null && na !== nb) return nb - na;
    if (na != null && nb == null) return -1;
    if (na == null && nb != null) return 1;
    return a.localeCompare(b, 'ru');
  }

  /**
   * Порядок опций фасета по атрибуту: по умолчанию — числа по убыванию; иначе алфавит или явный список.
   */
  private sortAttributeFacetEntries(
    entries: [string, number][],
    mode: CatalogFilterOptionsSort,
    manualOrder: unknown,
  ): [string, number][] {
    const manual = this.normalizeManualOptionOrder(manualOrder);
    if (mode === CatalogFilterOptionsSort.TEXT_ASC) {
      return [...entries].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
    }
    if (mode === CatalogFilterOptionsSort.MANUAL && manual.length > 0) {
      const idx = new Map<string, number>();
      for (let i = 0; i < manual.length; i++) {
        const key = manual[i];
        if (!idx.has(key)) idx.set(key, i);
      }
      return [...entries].sort((a, b) => {
        const ia = idx.has(a[0]) ? idx.get(a[0])! : Number.MAX_SAFE_INTEGER;
        const ib = idx.has(b[0]) ? idx.get(b[0])! : Number.MAX_SAFE_INTEGER;
        if (ia !== ib) return ia - ib;
        return this.compareFacetValuesNumericDescThenLocale(a[0], b[0]);
      });
    }
    return [...entries].sort((a, b) => this.compareFacetValuesNumericDescThenLocale(a[0], b[0]));
  }

  private normalizeManualOptionOrder(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const x of raw) {
      if (typeof x !== 'string') continue;
      const t = x.trim();
      if (t) out.push(t);
    }
    return out;
  }

  getAttrValueFromProductJson(
    attributes: unknown,
    meta: { slug: string; name: string },
  ): string | null {
    if (attributes == null) return null;
    if (Array.isArray(attributes)) {
      for (const item of attributes) {
        if (!item || typeof item !== 'object') continue;
        const o = item as Record<string, unknown>;
        if (o.slug === meta.slug && o.value != null) return String(o.value).trim();
        if (typeof o.name === 'string' && o.name === meta.name && o.value != null) {
          return String(o.value).trim();
        }
      }
      return null;
    }
    if (typeof attributes === 'object') {
      const o = attributes as Record<string, unknown>;
      const bySlug = o[meta.slug];
      if (bySlug != null) return String(bySlug).trim();
      const byName = o[meta.name];
      if (byName != null) return String(byName).trim();
    }
    return null;
  }

  private collectCategoryIds(category: CategoryWithChildren): string[] {
    const ids = [category.id];
    if (category.children && category.children.length > 0) {
      for (const child of category.children) {
        ids.push(...this.collectCategoryIds(child));
      }
    }
    return ids;
  }

  /**
   * Цепочка от текущей категории к корню: [текущая, родитель, ..., корень].
   */
  private async getCategoryAncestorChain(
    categoryId: string,
  ): Promise<Array<{ id: string; slug: string; name: string }>> {
    const chain: Array<{ id: string; slug: string; name: string }> = [];
    let id: string | null = categoryId;
    while (id) {
      const cat: Category | null = await this.prisma.category.findUnique({ where: { id } });
      if (!cat) break;
      chain.push({ id: cat.id, slug: cat.slug, name: cat.name });
      id = cat.parentId;
    }
    return chain;
  }

  /**
   * Выбирает наиболее «близкий» к просматриваемой категории активный блок.
   * includeDescendants: блок применяется, если якорь — предок текущей категории (или сама текущая).
   * Иначе только при совпадении якоря и текущей категории.
   */
  async resolveMatchingBlock(viewedCategoryId: string) {
    const chain: string[] = [];
    let id: string | null = viewedCategoryId;
    while (id) {
      chain.push(id);
      const cat: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id },
        select: { parentId: true },
      });
      id = cat?.parentId ?? null;
    }

    const blocks = await this.prisma.catalogFilterBlock.findMany({
      where: { isActive: true },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { attribute: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    let best: (typeof blocks)[number] | null = null;
    let bestDepth = Infinity;

    for (const b of blocks) {
      const depth = chain.indexOf(b.categoryId);
      if (depth === -1) continue;
      if (!b.includeDescendants && depth !== 0) continue;
      if (depth < bestDepth) {
        bestDepth = depth;
        best = b;
      }
    }

    return best;
  }

  private validateItemsInput(items: CatalogFilterBlockItemInputDto[]): void {
    let stock = 0;
    let mfr = 0;
    for (const it of items) {
      if (it.kind === 'ATTRIBUTE') {
        if (!it.attributeId?.trim()) {
          throw new BadRequestException('Для фильтра «Атрибут» нужно указать attributeId');
        }
      } else {
        if (it.attributeId) {
          throw new BadRequestException(
            'Для STOCK и MANUFACTURER поле attributeId должно быть пустым',
          );
        }
      }
      if (it.kind === 'STOCK') stock += 1;
      if (it.kind === 'MANUFACTURER') mfr += 1;
    }
    if (stock > 1) throw new BadRequestException('Не более одного фильтра «Наличие»');
    if (mfr > 1) throw new BadRequestException('Не более одного фильтра «Производитель»');
  }

  async assertAttributesBelongToCategory(
    categoryId: string,
    items: CatalogFilterBlockItemInputDto[],
  ) {
    const attrIds = items
      .filter((i) => i.kind === 'ATTRIBUTE' && i.attributeId)
      .map((i) => i.attributeId!);
    if (attrIds.length === 0) return;

    const links = await this.prisma.categoryAttribute.findMany({
      where: { categoryId, attributeId: { in: attrIds } },
    });
    const ok = new Set(links.map((l) => l.attributeId));
    for (const aid of attrIds) {
      if (!ok.has(aid)) {
        throw new BadRequestException(
          `Атрибут ${aid} не привязан к выбранной категории. Добавьте его в карточке категории.`,
        );
      }
    }
  }

  async getPublicFiltersByCategorySlug(categorySlug: string): Promise<CatalogFiltersResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
      include: {
        children: { include: { children: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug ${categorySlug} not found`);
    }

    const block = await this.resolveMatchingBlock(category.id);
    if (!block || block.items.length === 0) {
      return { branch: null, filters: [] };
    }

    const categoryIds = this.collectCategoryIds(category as CategoryWithChildren);

    const products = await this.prisma.product.findMany({
      where: {
        categoryId: { in: categoryIds },
        isActive: true,
      },
      select: {
        attributes: true,
        stock: true,
        onOrder: true,
        manufacturerId: true,
        manufacturer: { select: { id: true, name: true } },
        doorThickness: { select: { name: true } },
        weatherstrip: { select: { name: true } },
      },
    });

    const filters: CatalogFilterFacetDto[] = [];

    for (const item of block.items) {
      const facet = this.buildFacetFromBlockItem(item, products);
      if (facet) filters.push(facet);
    }

    return { branch: block.id, filters };
  }

  /** Построить один фасет по конфигурации блока и набору товаров (для faceted search). */
  buildFacetFromBlockItem(
    item: {
      kind: string;
      labelOverride?: string | null;
      optionsSort?: CatalogFilterOptionsSort;
      manualOptionOrder?: unknown;
      attribute?: { slug: string; name: string } | null;
    },
    products: Array<{
      attributes: unknown;
      stock: number;
      onOrder: boolean;
      manufacturerId: string | null;
      manufacturer?: { id: string; name: string } | null;
      doorThickness?: { name: string } | null;
      weatherstrip?: { name: string } | null;
    }>,
  ): CatalogFilterFacetDto | null {
    if (item.kind === 'STOCK') {
      let inStock = 0;
      let onOrderOnly = 0;
      let outOfStock = 0;
      for (const p of products) {
        const s = Number(p.stock ?? 0);
        if (s > 0) inStock += 1;
        else if (p.onOrder) onOrderOnly += 1;
        else outOfStock += 1;
      }
      return {
        id: 'availability',
        label: item.labelOverride?.trim() || 'Наличие',
        type: 'checkbox',
        options: [
          { value: 'in_stock', label: 'В наличии', count: inStock },
          { value: 'on_order', label: 'Под заказ', count: onOrderOnly },
          { value: 'out_of_stock', label: 'Товар закончился', count: outOfStock },
        ],
      };
    }

    if (item.kind === 'MANUFACTURER') {
      const map = new Map<string, { value: string; label: string; count: number }>();
      for (const p of products) {
        if (p.manufacturerId && p.manufacturer?.name) {
          const id = p.manufacturerId;
          const prev = map.get(id);
          if (prev) prev.count += 1;
          else map.set(id, { value: id, label: p.manufacturer.name, count: 1 });
        }
      }
      const options = Array.from(map.values())
        .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
        .map(({ value, label, count }) => ({ value, label, count }));
      return {
        id: 'manufacturer',
        label: item.labelOverride?.trim() || 'Производитель',
        type: 'checkbox',
        options,
      };
    }

    if (item.kind === 'ATTRIBUTE') {
      const meta = item.attribute;
      if (!meta) return null;
      const valueCounts = new Map<string, number>();
      for (const p of products) {
        const v = this.getAttrValueForFacetProduct(p, {
          slug: meta.slug,
          name: meta.name,
        });
        if (v) valueCounts.set(v, (valueCounts.get(v) ?? 0) + 1);
      }
      const sortedEntries = this.sortAttributeFacetEntries(
        Array.from(valueCounts.entries()),
        item.optionsSort ?? CatalogFilterOptionsSort.NUMERIC_DESC,
        item.manualOptionOrder,
      );
      const options = sortedEntries.map(([value, count]) => ({ value, label: value, count }));
      return {
        id: meta.slug,
        label: (item.labelOverride?.trim() || meta.name).trim(),
        type: 'checkbox',
        options,
        attributeSlug: meta.slug,
        attributeName: meta.name,
      };
    }

    return null;
  }

  async findAllAdmin() {
    return this.prisma.catalogFilterBlock.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        category: { select: { id: true, name: true, slug: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { attribute: { select: { id: true, name: true, slug: true } } },
        },
      },
    });
  }

  async findOneAdmin(id: string) {
    const row = await this.prisma.catalogFilterBlock.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { attribute: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Блок фильтров не найден');
    return row;
  }

  async create(dto: CreateCatalogFilterBlockDto) {
    this.validateItemsInput(dto.items);
    await this.assertAttributesBelongToCategory(dto.categoryId, dto.items);

    const existing = await this.prisma.catalogFilterBlock.findUnique({
      where: { categoryId: dto.categoryId },
    });
    if (existing) {
      throw new BadRequestException('Для этой категории уже задан блок фильтров');
    }

    return this.prisma.$transaction(async (tx) => {
      const block = await tx.catalogFilterBlock.create({
        data: {
          name: dto.name?.trim() ?? '',
          categoryId: dto.categoryId,
          includeDescendants: dto.includeDescendants ?? true,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
      await this.createItemsTx(tx, block.id, dto.items);
      return tx.catalogFilterBlock.findUnique({
        where: { id: block.id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          items: {
            orderBy: { sortOrder: 'asc' },
            include: { attribute: { select: { id: true, name: true, slug: true } } },
          },
        },
      });
    });
  }

  private async createItemsTx(
    tx: Prisma.TransactionClient,
    blockId: string,
    items: CatalogFilterBlockItemInputDto[],
  ) {
    for (const it of items) {
      const isAttr = it.kind === 'ATTRIBUTE';
      const optionsSort = isAttr
        ? (it.optionsSort ?? CatalogFilterOptionsSort.NUMERIC_DESC)
        : CatalogFilterOptionsSort.NUMERIC_DESC;
      const manualList =
        isAttr &&
        it.optionsSort === CatalogFilterOptionsSort.MANUAL &&
        Array.isArray(it.manualOptionOrder) &&
        it.manualOptionOrder.length > 0
          ? it.manualOptionOrder.map((s) => String(s).trim()).filter(Boolean)
          : null;
      await tx.catalogFilterBlockItem.create({
        data: {
          blockId,
          kind: it.kind,
          attributeId: isAttr ? (it.attributeId ?? null) : null,
          labelOverride: it.labelOverride?.trim() || null,
          sortOrder: it.sortOrder ?? 0,
          optionsSort,
          manualOptionOrder: manualList && manualList.length > 0 ? manualList : Prisma.JsonNull,
        },
      });
    }
  }

  async update(id: string, dto: UpdateCatalogFilterBlockDto) {
    const current = await this.prisma.catalogFilterBlock.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Блок фильтров не найден');

    const categoryId = dto.categoryId ?? current.categoryId;
    if (dto.items) {
      this.validateItemsInput(dto.items);
      await this.assertAttributesBelongToCategory(categoryId, dto.items);
    }

    if (dto.categoryId && dto.categoryId !== current.categoryId) {
      const clash = await this.prisma.catalogFilterBlock.findUnique({
        where: { categoryId: dto.categoryId },
      });
      if (clash && clash.id !== id) {
        throw new BadRequestException('Для этой категории уже есть другой блок фильтров');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.catalogFilterBlock.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.includeDescendants !== undefined && {
            includeDescendants: dto.includeDescendants,
          }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });

      if (dto.items) {
        await tx.catalogFilterBlockItem.deleteMany({ where: { blockId: id } });
        await this.createItemsTx(tx, id, dto.items);
      }

      return tx.catalogFilterBlock.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          items: {
            orderBy: { sortOrder: 'asc' },
            include: { attribute: { select: { id: true, name: true, slug: true } } },
          },
        },
      });
    });
  }

  async remove(id: string) {
    await this.prisma.catalogFilterBlock.delete({ where: { id } });
    return { ok: true };
  }
}
