import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { extname } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { CreateCeilingManufacturerDto } from './dto/create-ceiling-manufacturer.dto';
import { UpdateCeilingManufacturerDto } from './dto/update-ceiling-manufacturer.dto';
import { CreateCeilingFabricDto } from './dto/create-ceiling-fabric.dto';
import { UpdateCeilingFabricDto } from './dto/update-ceiling-fabric.dto';
import { UpdateStretchCeilingsSettingsDto } from './dto/update-stretch-ceilings-settings.dto';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';
import { FabricCharacteristicItemDto } from './dto/create-ceiling-fabric.dto';
import { FaqItemDto, StepItemDto } from './dto/update-stretch-ceilings-settings.dto';

/** Приводит DTO-классы к plain-объектам для Json-поля Prisma. */
function toCharacteristicJson(
  items?: FabricCharacteristicItemDto[],
): Prisma.InputJsonValue | undefined {
  if (!items) return undefined;
  return items.map((item) => ({ label: item.label, value: item.value }));
}

function toFaqJson(items?: FaqItemDto[]): Prisma.InputJsonValue | undefined {
  if (!items) return undefined;
  return items.map((item) => ({ question: item.question, answer: item.answer }));
}

function toStepsJson(items?: StepItemDto[]): Prisma.InputJsonValue | undefined {
  if (!items) return undefined;
  return items.map((item) => ({ title: item.title, description: item.description }));
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
export class StretchCeilingsService {
  constructor(private prisma: PrismaService) {}

  async uploadImage(file: Express.Multer.File, baseUrl: string): Promise<{ imageUrl: string }> {
    if (!file?.path) {
      throw new ConflictException('Файл не загружен');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'stretch-ceilings');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = extname(file.originalname) || '.jpg';
    const filename = `ceiling-${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destPath);
    const imageUrl = `/uploads/stretch-ceilings/${filename}`;
    const prefix = uploadsBaseUrl(baseUrl);
    return { imageUrl: `${prefix}${imageUrl}` };
  }

  // ===== Производители полотен =====

  async findManufacturers() {
    return this.prisma.ceilingManufacturer.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { fabrics: true } } },
    });
  }

  async findManufacturer(id: string) {
    const manufacturer = await this.prisma.ceilingManufacturer.findUnique({
      where: { id },
      include: { fabrics: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
    });
    if (!manufacturer) {
      throw new NotFoundException(`Производитель потолков "${id}" не найден`);
    }
    return manufacturer;
  }

  async createManufacturer(dto: CreateCeilingManufacturerDto) {
    const existing = await this.prisma.ceilingManufacturer.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Производитель с slug "${dto.slug}" уже существует`);
    }
    return this.prisma.ceilingManufacturer.create({
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

  async updateManufacturer(id: string, dto: UpdateCeilingManufacturerDto) {
    await this.findManufacturer(id);
    if (dto.slug) {
      const existing = await this.prisma.ceilingManufacturer.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Производитель с slug "${dto.slug}" уже существует`);
      }
    }
    return this.prisma.ceilingManufacturer.update({
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

  async removeManufacturer(id: string) {
    await this.findManufacturer(id);
    return this.prisma.ceilingManufacturer.delete({ where: { id } });
  }

  // ===== Фактуры =====

  async findFabrics(manufacturerId?: string) {
    return this.prisma.ceilingFabric.findMany({
      where: manufacturerId ? { manufacturerId } : undefined,
      orderBy: [{ manufacturer: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: { manufacturer: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findFabric(id: string) {
    const fabric = await this.prisma.ceilingFabric.findUnique({
      where: { id },
      include: { manufacturer: { select: { id: true, name: true, slug: true } } },
    });
    if (!fabric) {
      throw new NotFoundException(`Фактура полотна "${id}" не найдена`);
    }
    return fabric;
  }

  async createFabric(dto: CreateCeilingFabricDto) {
    const manufacturer = await this.prisma.ceilingManufacturer.findUnique({
      where: { id: dto.manufacturerId },
    });
    if (!manufacturer) {
      throw new NotFoundException(`Производитель "${dto.manufacturerId}" не найден`);
    }
    const existing = await this.prisma.ceilingFabric.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Фактура с slug "${dto.slug}" уже существует`);
    }
    return this.prisma.ceilingFabric.create({
      data: {
        manufacturerId: dto.manufacturerId,
        name: dto.name,
        slug: dto.slug,
        textureType: emptyToNull(dto.textureType) ?? null,
        tagline: emptyToNull(dto.tagline) ?? null,
        description: dto.description,
        imageUrl: emptyToNull(dto.imageUrl) ?? null,
        videoUrl: emptyToNull(dto.videoUrl) ?? null,
        width: emptyToNull(dto.width) ?? null,
        characteristics: toCharacteristicJson(dto.characteristics),
        advantages: dto.advantages ?? [],
        priceFrom: dto.priceFrom ?? null,
        badge: emptyToNull(dto.badge) ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: { manufacturer: { select: { id: true, name: true, slug: true } } },
    });
  }

  async updateFabric(id: string, dto: UpdateCeilingFabricDto) {
    await this.findFabric(id);
    if (dto.manufacturerId) {
      const manufacturer = await this.prisma.ceilingManufacturer.findUnique({
        where: { id: dto.manufacturerId },
      });
      if (!manufacturer) {
        throw new NotFoundException(`Производитель "${dto.manufacturerId}" не найден`);
      }
    }
    if (dto.slug) {
      const existing = await this.prisma.ceilingFabric.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Фактура с slug "${dto.slug}" уже существует`);
      }
    }
    return this.prisma.ceilingFabric.update({
      where: { id },
      data: {
        ...(dto.manufacturerId !== undefined && { manufacturerId: dto.manufacturerId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.textureType !== undefined && { textureType: emptyToNull(dto.textureType) }),
        ...(dto.tagline !== undefined && { tagline: emptyToNull(dto.tagline) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: emptyToNull(dto.imageUrl) }),
        ...(dto.videoUrl !== undefined && { videoUrl: emptyToNull(dto.videoUrl) }),
        ...(dto.width !== undefined && { width: emptyToNull(dto.width) }),
        ...(dto.characteristics !== undefined && {
          characteristics: toCharacteristicJson(dto.characteristics),
        }),
        ...(dto.advantages !== undefined && { advantages: dto.advantages }),
        ...(dto.priceFrom !== undefined && { priceFrom: dto.priceFrom }),
        ...(dto.badge !== undefined && { badge: emptyToNull(dto.badge) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      } as Prisma.CeilingFabricUncheckedUpdateInput,
      include: { manufacturer: { select: { id: true, name: true, slug: true } } },
    });
  }

  async removeFabric(id: string) {
    await this.findFabric(id);
    return this.prisma.ceilingFabric.delete({ where: { id } });
  }

  // ===== Настройки раздела =====

  async getSettings() {
    const settings = await this.prisma.stretchCeilingsPageBlock.findUnique({
      where: { id: 'main' },
    });
    // Возвращаем дефолты, пока админ не сохранил свои настройки
    return (
      settings ?? {
        id: 'main',
        title: 'Натяжные потолки',
        subtitle: null,
        description: null,
        heroImageUrl: null,
        seoTitle: null,
        seoDescription: null,
        comparisonShow: true,
        comparisonTitle: null,
        comparisonNote: null,
        comparisonShowTexture: true,
        comparisonShowWidth: true,
        comparisonShowPrice: true,
        comparisonShowCountry: true,
        calcShow: true,
        calcTitle: null,
        calcNote: null,
        calcPricePerMeterBaget: 180,
        calcPricePerCorner: 150,
        calcPricePerLight: 450,
        calcPricePerPipe: 350,
        calcLightOptionPrice: 600,
        calcCorniceOptionPrice: 900,
        calcMinOrder: 3000,
        steps: null,
        faq: null,
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

  async updateSettings(dto: UpdateStretchCeilingsSettingsDto) {
    return this.prisma.stretchCeilingsPageBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        title: dto.title?.trim() || 'Натяжные потолки',
        subtitle: emptyToNull(dto.subtitle) ?? null,
        description: emptyToNull(dto.description) ?? null,
        heroImageUrl: emptyToNull(dto.heroImageUrl) ?? null,
        seoTitle: emptyToNull(dto.seoTitle) ?? null,
        seoDescription: emptyToNull(dto.seoDescription) ?? null,
        comparisonShow: dto.comparisonShow ?? true,
        comparisonTitle: emptyToNull(dto.comparisonTitle) ?? null,
        comparisonNote: emptyToNull(dto.comparisonNote) ?? null,
        comparisonShowTexture: dto.comparisonShowTexture ?? true,
        comparisonShowWidth: dto.comparisonShowWidth ?? true,
        comparisonShowPrice: dto.comparisonShowPrice ?? true,
        comparisonShowCountry: dto.comparisonShowCountry ?? true,
        calcShow: dto.calcShow ?? true,
        calcTitle: emptyToNull(dto.calcTitle) ?? null,
        calcNote: emptyToNull(dto.calcNote) ?? null,
        calcPricePerMeterBaget: dto.calcPricePerMeterBaget ?? 180,
        calcPricePerCorner: dto.calcPricePerCorner ?? 150,
        calcPricePerLight: dto.calcPricePerLight ?? 450,
        calcPricePerPipe: dto.calcPricePerPipe ?? 350,
        calcLightOptionPrice: dto.calcLightOptionPrice ?? 600,
        calcCorniceOptionPrice: dto.calcCorniceOptionPrice ?? 900,
        calcMinOrder: dto.calcMinOrder ?? 3000,
        steps: toStepsJson(dto.steps),
        faq: toFaqJson(dto.faq),
        ctaBackgroundColor: emptyToNull(dto.ctaBackgroundColor) ?? null,
        ctaBackgroundImage: emptyToNull(dto.ctaBackgroundImage) ?? null,
        ctaBackgroundFit: dto.ctaBackgroundFit ?? 'contain',
        ctaBackgroundImageOpacity: dto.ctaBackgroundImageOpacity ?? 30,
        ctaTextColor: emptyToNull(dto.ctaTextColor) ?? null,
        ctaShowButtons: dto.ctaShowButtons ?? true,
      },
      update: {
        ...(dto.title !== undefined && { title: dto.title.trim() || 'Натяжные потолки' }),
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
        ...(dto.comparisonShowTexture !== undefined && {
          comparisonShowTexture: dto.comparisonShowTexture,
        }),
        ...(dto.comparisonShowWidth !== undefined && {
          comparisonShowWidth: dto.comparisonShowWidth,
        }),
        ...(dto.comparisonShowPrice !== undefined && {
          comparisonShowPrice: dto.comparisonShowPrice,
        }),
        ...(dto.comparisonShowCountry !== undefined && {
          comparisonShowCountry: dto.comparisonShowCountry,
        }),
        ...(dto.calcShow !== undefined && { calcShow: dto.calcShow }),
        ...(dto.calcTitle !== undefined && { calcTitle: emptyToNull(dto.calcTitle) }),
        ...(dto.calcNote !== undefined && { calcNote: emptyToNull(dto.calcNote) }),
        ...(dto.calcPricePerMeterBaget !== undefined && {
          calcPricePerMeterBaget: dto.calcPricePerMeterBaget,
        }),
        ...(dto.calcPricePerCorner !== undefined && {
          calcPricePerCorner: dto.calcPricePerCorner,
        }),
        ...(dto.calcPricePerLight !== undefined && {
          calcPricePerLight: dto.calcPricePerLight,
        }),
        ...(dto.calcPricePerPipe !== undefined && {
          calcPricePerPipe: dto.calcPricePerPipe,
        }),
        ...(dto.calcLightOptionPrice !== undefined && {
          calcLightOptionPrice: dto.calcLightOptionPrice,
        }),
        ...(dto.calcCorniceOptionPrice !== undefined && {
          calcCorniceOptionPrice: dto.calcCorniceOptionPrice,
        }),
        ...(dto.calcMinOrder !== undefined && { calcMinOrder: dto.calcMinOrder }),
        ...(dto.steps !== undefined && { steps: toStepsJson(dto.steps) }),
        ...(dto.faq !== undefined && { faq: toFaqJson(dto.faq) }),
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
    const [settings, manufacturers] = await Promise.all([
      this.getSettings(),
      this.prisma.ceilingManufacturer.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          fabrics: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
        },
      }),
    ]);
    return { settings, manufacturers };
  }
}
