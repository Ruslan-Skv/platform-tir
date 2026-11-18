import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { extname } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { CreateWindowBrandDto } from './dto/create-window-brand.dto';
import { UpdateWindowBrandDto } from './dto/update-window-brand.dto';
import { CreateWindowSystemDto } from './dto/create-window-system.dto';
import { UpdateWindowSystemDto } from './dto/update-window-system.dto';
import { UpdateWindowsSettingsDto } from './dto/update-windows-settings.dto';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';
import { WindowCharacteristicItemDto } from './dto/create-window-system.dto';

/** Приводит DTO-классы к plain-объектам для Json-поля Prisma. */
function toCharacteristicJson(
  items?: WindowCharacteristicItemDto[],
): Prisma.InputJsonValue | undefined {
  if (!items) return undefined;
  return items.map((item) => ({ label: item.label, value: item.value }));
}

/**
 * Строка из админки: undefined — не менять, пустая строка/пробелы — очистить (null), иначе значение.
 * Нужно, чтобы «Убрать изображение/цвет» в админке реально очищал поля в БД.
 */
function emptyToNull(value?: string): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

@Injectable()
export class WindowsService {
  constructor(private prisma: PrismaService) {}

  async uploadImage(file: Express.Multer.File, baseUrl: string): Promise<{ imageUrl: string }> {
    if (!file?.path) {
      throw new ConflictException('Файл не загружен');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'windows');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = extname(file.originalname) || '.jpg';
    const filename = `window-${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destPath);
    const imageUrl = `/uploads/windows/${filename}`;
    const prefix = uploadsBaseUrl(baseUrl);
    return { imageUrl: `${prefix}${imageUrl}` };
  }

  // ===== Бренды (производители профильных систем) =====

  async findBrands() {
    return this.prisma.windowBrand.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { systems: true } } },
    });
  }

  async findBrand(id: string) {
    const brand = await this.prisma.windowBrand.findUnique({
      where: { id },
      include: { systems: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
    });
    if (!brand) {
      throw new NotFoundException(`Бренд окон "${id}" не найден`);
    }
    return brand;
  }

  async createBrand(dto: CreateWindowBrandDto) {
    const existing = await this.prisma.windowBrand.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Бренд с slug "${dto.slug}" уже существует`);
    }
    return this.prisma.windowBrand.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        logoUrl: emptyToNull(dto.logoUrl) ?? null,
        country: emptyToNull(dto.country) ?? null,
        description: emptyToNull(dto.description) ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateBrand(id: string, dto: UpdateWindowBrandDto) {
    await this.findBrand(id);
    if (dto.slug) {
      const existing = await this.prisma.windowBrand.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Бренд с slug "${dto.slug}" уже существует`);
      }
    }
    return this.prisma.windowBrand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.logoUrl !== undefined && { logoUrl: emptyToNull(dto.logoUrl) }),
        ...(dto.country !== undefined && { country: emptyToNull(dto.country) }),
        ...(dto.description !== undefined && { description: emptyToNull(dto.description) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async removeBrand(id: string) {
    await this.findBrand(id);
    return this.prisma.windowBrand.delete({ where: { id } });
  }

  // ===== Профильные системы =====

  async findSystems(brandId?: string) {
    return this.prisma.windowProfileSystem.findMany({
      where: brandId ? { brandId } : undefined,
      orderBy: [{ brand: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: { brand: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findSystem(id: string) {
    const system = await this.prisma.windowProfileSystem.findUnique({
      where: { id },
      include: { brand: { select: { id: true, name: true, slug: true } } },
    });
    if (!system) {
      throw new NotFoundException(`Профильная система "${id}" не найдена`);
    }
    return system;
  }

  async createSystem(dto: CreateWindowSystemDto) {
    const brand = await this.prisma.windowBrand.findUnique({ where: { id: dto.brandId } });
    if (!brand) {
      throw new NotFoundException(`Бренд "${dto.brandId}" не найден`);
    }
    const existing = await this.prisma.windowProfileSystem.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Профильная система с slug "${dto.slug}" уже существует`);
    }
    return this.prisma.windowProfileSystem.create({
      data: {
        brandId: dto.brandId,
        name: dto.name,
        slug: dto.slug,
        tagline: emptyToNull(dto.tagline) ?? null,
        description: dto.description,
        imageUrl: emptyToNull(dto.imageUrl) ?? null,
        chambers: dto.chambers ?? null,
        mountingDepth: dto.mountingDepth ?? null,
        glassUnitWidth: emptyToNull(dto.glassUnitWidth) ?? null,
        thermalResistance: emptyToNull(dto.thermalResistance) ?? null,
        soundInsulation: emptyToNull(dto.soundInsulation) ?? null,
        characteristics: toCharacteristicJson(dto.characteristics),
        advantages: dto.advantages ?? [],
        priceFrom: dto.priceFrom ?? null,
        badge: emptyToNull(dto.badge) ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: { brand: { select: { id: true, name: true, slug: true } } },
    });
  }

  async updateSystem(id: string, dto: UpdateWindowSystemDto) {
    await this.findSystem(id);
    if (dto.brandId) {
      const brand = await this.prisma.windowBrand.findUnique({ where: { id: dto.brandId } });
      if (!brand) {
        throw new NotFoundException(`Бренд "${dto.brandId}" не найден`);
      }
    }
    if (dto.slug) {
      const existing = await this.prisma.windowProfileSystem.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Профильная система с slug "${dto.slug}" уже существует`);
      }
    }
    return this.prisma.windowProfileSystem.update({
      where: { id },
      data: {
        ...(dto.brandId !== undefined && { brandId: dto.brandId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.tagline !== undefined && { tagline: emptyToNull(dto.tagline) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: emptyToNull(dto.imageUrl) }),
        ...(dto.chambers !== undefined && { chambers: dto.chambers }),
        ...(dto.mountingDepth !== undefined && { mountingDepth: dto.mountingDepth }),
        ...(dto.glassUnitWidth !== undefined && {
          glassUnitWidth: emptyToNull(dto.glassUnitWidth),
        }),
        ...(dto.thermalResistance !== undefined && {
          thermalResistance: emptyToNull(dto.thermalResistance),
        }),
        ...(dto.soundInsulation !== undefined && {
          soundInsulation: emptyToNull(dto.soundInsulation),
        }),
        ...(dto.characteristics !== undefined && {
          characteristics: toCharacteristicJson(dto.characteristics),
        }),
        ...(dto.advantages !== undefined && { advantages: dto.advantages }),
        ...(dto.priceFrom !== undefined && { priceFrom: dto.priceFrom }),
        ...(dto.badge !== undefined && { badge: emptyToNull(dto.badge) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      } as Prisma.WindowProfileSystemUncheckedUpdateInput,
      include: { brand: { select: { id: true, name: true, slug: true } } },
    });
  }

  async removeSystem(id: string) {
    await this.findSystem(id);
    return this.prisma.windowProfileSystem.delete({ where: { id } });
  }

  // ===== Настройки раздела =====

  async getSettings() {
    const settings = await this.prisma.windowsPageBlock.findUnique({ where: { id: 'main' } });
    // Возвращаем дефолты, пока админ не сохранил свои настройки
    return (
      settings ?? {
        id: 'main',
        title: 'Пластиковые окна',
        subtitle: null,
        description: null,
        heroImageUrl: null,
        seoTitle: null,
        seoDescription: null,
        comparisonShow: true,
        comparisonTitle: null,
        comparisonNote: null,
        comparisonShowChambers: true,
        comparisonShowDepth: true,
        comparisonShowGlass: true,
        comparisonShowThermal: true,
        comparisonShowSound: true,
        ctaBackgroundColor: null,
        ctaBackgroundImage: null,
        ctaBackgroundFit: 'contain',
        ctaBackgroundImageOpacity: 30,
        ctaTextColor: null,
        ctaShowButtons: true,
        updatedAt: new Date(),
      }
    );
  }

  async updateSettings(dto: UpdateWindowsSettingsDto) {
    return this.prisma.windowsPageBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        title: dto.title?.trim() || 'Пластиковые окна',
        subtitle: emptyToNull(dto.subtitle) ?? null,
        description: emptyToNull(dto.description) ?? null,
        heroImageUrl: emptyToNull(dto.heroImageUrl) ?? null,
        seoTitle: emptyToNull(dto.seoTitle) ?? null,
        seoDescription: emptyToNull(dto.seoDescription) ?? null,
        comparisonShow: dto.comparisonShow ?? true,
        comparisonTitle: emptyToNull(dto.comparisonTitle) ?? null,
        comparisonNote: emptyToNull(dto.comparisonNote) ?? null,
        comparisonShowChambers: dto.comparisonShowChambers ?? true,
        comparisonShowDepth: dto.comparisonShowDepth ?? true,
        comparisonShowGlass: dto.comparisonShowGlass ?? true,
        comparisonShowThermal: dto.comparisonShowThermal ?? true,
        comparisonShowSound: dto.comparisonShowSound ?? true,
        ctaBackgroundColor: emptyToNull(dto.ctaBackgroundColor) ?? null,
        ctaBackgroundImage: emptyToNull(dto.ctaBackgroundImage) ?? null,
        ctaBackgroundFit: dto.ctaBackgroundFit ?? 'contain',
        ctaBackgroundImageOpacity: dto.ctaBackgroundImageOpacity ?? 30,
        ctaTextColor: emptyToNull(dto.ctaTextColor) ?? null,
        ctaShowButtons: dto.ctaShowButtons ?? true,
      },
      update: {
        ...(dto.title !== undefined && { title: dto.title.trim() || 'Пластиковые окна' }),
        ...(dto.subtitle !== undefined && { subtitle: emptyToNull(dto.subtitle) }),
        ...(dto.description !== undefined && { description: emptyToNull(dto.description) }),
        ...(dto.heroImageUrl !== undefined && { heroImageUrl: emptyToNull(dto.heroImageUrl) }),
        ...(dto.seoTitle !== undefined && { seoTitle: emptyToNull(dto.seoTitle) }),
        ...(dto.seoDescription !== undefined && {
          seoDescription: emptyToNull(dto.seoDescription),
        }),
        ...(dto.comparisonShow !== undefined && { comparisonShow: dto.comparisonShow }),
        ...(dto.comparisonTitle !== undefined && {
          comparisonTitle: emptyToNull(dto.comparisonTitle),
        }),
        ...(dto.comparisonNote !== undefined && {
          comparisonNote: emptyToNull(dto.comparisonNote),
        }),
        ...(dto.comparisonShowChambers !== undefined && {
          comparisonShowChambers: dto.comparisonShowChambers,
        }),
        ...(dto.comparisonShowDepth !== undefined && {
          comparisonShowDepth: dto.comparisonShowDepth,
        }),
        ...(dto.comparisonShowGlass !== undefined && {
          comparisonShowGlass: dto.comparisonShowGlass,
        }),
        ...(dto.comparisonShowThermal !== undefined && {
          comparisonShowThermal: dto.comparisonShowThermal,
        }),
        ...(dto.comparisonShowSound !== undefined && {
          comparisonShowSound: dto.comparisonShowSound,
        }),
        ...(dto.ctaBackgroundColor !== undefined && {
          ctaBackgroundColor: emptyToNull(dto.ctaBackgroundColor),
        }),
        ...(dto.ctaBackgroundImage !== undefined && {
          ctaBackgroundImage: emptyToNull(dto.ctaBackgroundImage),
        }),
        ...(dto.ctaBackgroundFit !== undefined && { ctaBackgroundFit: dto.ctaBackgroundFit }),
        ...(dto.ctaTextColor !== undefined && { ctaTextColor: emptyToNull(dto.ctaTextColor) }),
        ...(dto.ctaBackgroundImageOpacity !== undefined && {
          ctaBackgroundImageOpacity: dto.ctaBackgroundImageOpacity,
        }),
        ...(dto.ctaShowButtons !== undefined && { ctaShowButtons: dto.ctaShowButtons }),
      },
    });
  }

  // ===== Публичные данные =====

  async getPublicSection() {
    const [settings, brands] = await Promise.all([
      this.getSettings(),
      this.prisma.windowBrand.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          systems: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
        },
      }),
    ]);
    return { settings, brands };
  }
}
