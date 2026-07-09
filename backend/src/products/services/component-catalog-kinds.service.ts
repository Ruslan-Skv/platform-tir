import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateComponentCatalogKindDto } from '../dto/create-component-catalog-kind.dto';
import { UpdateComponentCatalogKindDto } from '../dto/update-component-catalog-kind.dto';
import {
  ComponentKindSettingsMap,
  defaultKitQuantity,
  defaultQuantityStep,
} from '../utils/component-catalog-resolve.util';
import { slugifyComponentCatalog } from '../utils/component-catalog-slug.util';

@Injectable()
export class ComponentCatalogKindsService {
  private mapCache: { at: number; map: ComponentKindSettingsMap } | null = null;
  private readonly cacheTtlMs = 30_000;

  constructor(private prisma: PrismaService) {}

  async findAll() {
    const data = await this.prisma.componentCatalogKind.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { items: true } } },
    });
    return { data };
  }

  async findOne(id: string) {
    const row = await this.prisma.componentCatalogKind.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!row) throw new NotFoundException(`Вид комплектующего ${id} не найден`);
    return row;
  }

  async findByCode(code: string) {
    return this.prisma.componentCatalogKind.findUnique({ where: { code } });
  }

  async create(dto: CreateComponentCatalogKindDto) {
    const name = dto.name.trim();
    const slug = (dto.slug?.trim() || slugifyComponentCatalog(name)).trim();
    const code = (dto.code?.trim() || this.codeFromName(name)).trim();

    await this.ensureUniqueCodeAndSlug(code, slug);

    const maxSort = await this.prisma.componentCatalogKind.aggregate({ _max: { sortOrder: true } });

    const row = await this.prisma.componentCatalogKind.create({
      data: {
        name,
        code,
        slug,
        kitQuantity: dto.kitQuantity ?? null,
        quantityStep: dto.quantityStep ?? 1,
        sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
        isActive: dto.isActive ?? true,
      },
      include: { _count: { select: { items: true } } },
    });
    this.invalidateCache();
    return row;
  }

  async update(id: string, dto: UpdateComponentCatalogKindDto) {
    await this.findOne(id);
    const data: Prisma.ComponentCatalogKindUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.kitQuantity !== undefined) data.kitQuantity = dto.kitQuantity;
    if (dto.quantityStep !== undefined) data.quantityStep = dto.quantityStep;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.code !== undefined) {
      const code = dto.code.trim();
      const existing = await this.prisma.componentCatalogKind.findFirst({
        where: { code, NOT: { id } },
      });
      if (existing) throw new ConflictException(`Код вида «${code}» уже используется`);
      data.code = code;
    }

    if (dto.slug !== undefined) {
      const slug = dto.slug.trim();
      const existing = await this.prisma.componentCatalogKind.findFirst({
        where: { slug, NOT: { id } },
      });
      if (existing) throw new ConflictException(`Slug «${slug}» уже используется`);
      data.slug = slug;
    }

    const row = await this.prisma.componentCatalogKind.update({
      where: { id },
      data,
      include: { _count: { select: { items: true } } },
    });
    this.invalidateCache();
    return row;
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    if (row._count.items > 0) {
      throw new BadRequestException(
        `Нельзя удалить вид «${row.name}»: к нему привязано ${row._count.items} позиций`,
      );
    }
    await this.prisma.componentCatalogKind.delete({ where: { id } });
    this.invalidateCache();
    return { success: true };
  }

  async resolveKindId(kindIdOrCode: string): Promise<string> {
    const byId = await this.prisma.componentCatalogKind.findUnique({
      where: { id: kindIdOrCode },
      select: { id: true },
    });
    if (byId) return byId.id;

    const byCode = await this.prisma.componentCatalogKind.findUnique({
      where: { code: kindIdOrCode },
      select: { id: true },
    });
    if (byCode) return byCode.id;

    throw new NotFoundException(`Вид комплектующего «${kindIdOrCode}» не найден`);
  }

  async getDefaultKindId(): Promise<string> {
    const other = await this.prisma.componentCatalogKind.findFirst({
      where: { code: 'OTHER' },
      select: { id: true },
    });
    if (other) return other.id;
    const first = await this.prisma.componentCatalogKind.findFirst({
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });
    if (!first) throw new NotFoundException('Справочник видов комплектующих пуст');
    return first.id;
  }

  async getMap(): Promise<ComponentKindSettingsMap> {
    const now = Date.now();
    if (this.mapCache && now - this.mapCache.at < this.cacheTtlMs) {
      return this.mapCache.map;
    }
    const rows = await this.prisma.componentCatalogKind.findMany({
      where: { isActive: true },
    });
    const map: ComponentKindSettingsMap = {};
    for (const row of rows) {
      map[row.code] = {
        kitQuantity: row.kitQuantity,
        quantityStep: row.quantityStep,
      };
    }
    this.mapCache = { at: now, map };
    return map;
  }

  invalidateCache() {
    this.mapCache = null;
  }

  private codeFromName(name: string): string {
    return slugifyComponentCatalog(name).replace(/-/g, '_').toUpperCase().slice(0, 48);
  }

  private async ensureUniqueCodeAndSlug(code: string, slug: string) {
    const [codeExists, slugExists] = await Promise.all([
      this.prisma.componentCatalogKind.findUnique({ where: { code } }),
      this.prisma.componentCatalogKind.findUnique({ where: { slug } }),
    ]);
    if (codeExists) throw new ConflictException(`Код вида «${code}» уже существует`);
    if (slugExists) throw new ConflictException(`Slug «${slug}» уже существует`);
  }

  /** Для legacy-импорта: найти вид по коду или создать OTHER */
  async resolveKindIdByCode(code: string): Promise<string> {
    const row = await this.findByCode(code);
    if (row) return row.id;
    return this.getDefaultKindId();
  }

  async ensureLegacyKind(code: string, name: string) {
    const existing = await this.findByCode(code);
    if (existing) return existing;
    return this.create({
      name,
      code,
      kitQuantity: defaultKitQuantity(code),
      quantityStep: defaultQuantityStep(code),
    });
  }
}
