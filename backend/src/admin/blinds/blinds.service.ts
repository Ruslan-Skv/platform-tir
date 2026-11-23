import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { extname } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { CreateBlindsCategoryDto } from './dto/create-blinds-category.dto';
import { UpdateBlindsCategoryDto } from './dto/update-blinds-category.dto';
import { CreateBlindsProductDto } from './dto/create-blinds-product.dto';
import { UpdateBlindsProductDto } from './dto/update-blinds-product.dto';
import { UpdateBlindsSettingsDto } from './dto/update-blinds-settings.dto';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';
import { ProductCharacteristicItemDto } from './dto/create-blinds-product.dto';
import { FaqItemDto, StepItemDto } from './dto/update-blinds-settings.dto';

/** Приводит DTO-классы к plain-объектам для Json-поля Prisma. */
function toCharacteristicJson(
  items?: ProductCharacteristicItemDto[],
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
export class BlindsService {
  constructor(private prisma: PrismaService) {}

  async uploadImage(file: Express.Multer.File, baseUrl: string): Promise<{ imageUrl: string }> {
    if (!file?.path) {
      throw new ConflictException('Файл не загружен');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'blinds');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = extname(file.originalname) || '.jpg';
    const filename = `blinds-${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destPath);
    const imageUrl = `/uploads/blinds/${filename}`;
    const prefix = uploadsBaseUrl(baseUrl);
    return { imageUrl: `${prefix}${imageUrl}` };
  }

  // ===== Категории изделий =====

  async findCategories() {
    return this.prisma.blindsCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  async findCategory(id: string) {
    const category = await this.prisma.blindsCategory.findUnique({
      where: { id },
      include: { products: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
    });
    if (!category) {
      throw new NotFoundException(`Категория жалюзи "${id}" не найдена`);
    }
    return category;
  }

  async createCategory(dto: CreateBlindsCategoryDto) {
    const existing = await this.prisma.blindsCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Категория с slug "${dto.slug}" уже существует`);
    }
    return this.prisma.blindsCategory.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        imageUrl: emptyToNull(dto.imageUrl) ?? null,
        description: emptyToNull(dto.description) ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateBlindsCategoryDto) {
    await this.findCategory(id);
    if (dto.slug) {
      const existing = await this.prisma.blindsCategory.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Категория с slug "${dto.slug}" уже существует`);
      }
    }
    return this.prisma.blindsCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.imageUrl !== undefined && { imageUrl: emptyToNull(dto.imageUrl) }),
        ...(dto.description !== undefined && { description: emptyToNull(dto.description) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async removeCategory(id: string) {
    await this.findCategory(id);
    return this.prisma.blindsCategory.delete({ where: { id } });
  }

  // ===== Изделия =====

  async findProducts(categoryId?: string) {
    return this.prisma.blindsProduct.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findProduct(id: string) {
    const product = await this.prisma.blindsProduct.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    if (!product) {
      throw new NotFoundException(`Изделие жалюзи "${id}" не найдено`);
    }
    return product;
  }

  async createProduct(dto: CreateBlindsProductDto) {
    const category = await this.prisma.blindsCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Категория "${dto.categoryId}" не найдена`);
    }
    const existing = await this.prisma.blindsProduct.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Изделие с slug "${dto.slug}" уже существует`);
    }
    return this.prisma.blindsProduct.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug: dto.slug,
        tagline: emptyToNull(dto.tagline) ?? null,
        description: dto.description,
        imageUrl: emptyToNull(dto.imageUrl) ?? null,
        videoUrl: emptyToNull(dto.videoUrl) ?? null,
        mountType: emptyToNull(dto.mountType) ?? null,
        material: emptyToNull(dto.material) ?? null,
        controlType: emptyToNull(dto.controlType) ?? null,
        characteristics: toCharacteristicJson(dto.characteristics),
        advantages: dto.advantages ?? [],
        priceFrom: dto.priceFrom ?? null,
        badge: emptyToNull(dto.badge) ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async updateProduct(id: string, dto: UpdateBlindsProductDto) {
    await this.findProduct(id);
    if (dto.categoryId) {
      const category = await this.prisma.blindsCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Категория "${dto.categoryId}" не найдена`);
      }
    }
    if (dto.slug) {
      const existing = await this.prisma.blindsProduct.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Изделие с slug "${dto.slug}" уже существует`);
      }
    }
    return this.prisma.blindsProduct.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.tagline !== undefined && { tagline: emptyToNull(dto.tagline) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: emptyToNull(dto.imageUrl) }),
        ...(dto.videoUrl !== undefined && { videoUrl: emptyToNull(dto.videoUrl) }),
        ...(dto.mountType !== undefined && { mountType: emptyToNull(dto.mountType) }),
        ...(dto.material !== undefined && { material: emptyToNull(dto.material) }),
        ...(dto.controlType !== undefined && { controlType: emptyToNull(dto.controlType) }),
        ...(dto.characteristics !== undefined && {
          characteristics: toCharacteristicJson(dto.characteristics),
        }),
        ...(dto.advantages !== undefined && { advantages: dto.advantages }),
        ...(dto.priceFrom !== undefined && { priceFrom: dto.priceFrom }),
        ...(dto.badge !== undefined && { badge: emptyToNull(dto.badge) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      } as Prisma.BlindsProductUncheckedUpdateInput,
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async removeProduct(id: string) {
    await this.findProduct(id);
    return this.prisma.blindsProduct.delete({ where: { id } });
  }

  // ===== Настройки раздела =====

  async getSettings() {
    const settings = await this.prisma.blindsPageBlock.findUnique({
      where: { id: 'main' },
    });
    // Возвращаем дефолты, пока админ не сохранил свои настройки
    return (
      settings ?? {
        id: 'main',
        title: 'Жалюзи',
        subtitle: null,
        description: null,
        heroImageUrl: null,
        seoTitle: null,
        seoDescription: null,
        comparisonShow: true,
        comparisonTitle: null,
        comparisonNote: null,
        comparisonShowMount: true,
        comparisonShowMaterial: true,
        comparisonShowControl: true,
        comparisonShowPrice: true,
        calcShow: true,
        calcTitle: null,
        calcNote: null,
        calcMountPrice: 300,
        calcMotorPrice: 5500,
        calcNoDrillPrice: 400,
        calcMinOrder: 2500,
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

  async updateSettings(dto: UpdateBlindsSettingsDto) {
    return this.prisma.blindsPageBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        title: dto.title?.trim() || 'Жалюзи',
        subtitle: emptyToNull(dto.subtitle) ?? null,
        description: emptyToNull(dto.description) ?? null,
        heroImageUrl: emptyToNull(dto.heroImageUrl) ?? null,
        seoTitle: emptyToNull(dto.seoTitle) ?? null,
        seoDescription: emptyToNull(dto.seoDescription) ?? null,
        comparisonShow: dto.comparisonShow ?? true,
        comparisonTitle: emptyToNull(dto.comparisonTitle) ?? null,
        comparisonNote: emptyToNull(dto.comparisonNote) ?? null,
        comparisonShowMount: dto.comparisonShowMount ?? true,
        comparisonShowMaterial: dto.comparisonShowMaterial ?? true,
        comparisonShowControl: dto.comparisonShowControl ?? true,
        comparisonShowPrice: dto.comparisonShowPrice ?? true,
        calcShow: dto.calcShow ?? true,
        calcTitle: emptyToNull(dto.calcTitle) ?? null,
        calcNote: emptyToNull(dto.calcNote) ?? null,
        calcMountPrice: dto.calcMountPrice ?? 300,
        calcMotorPrice: dto.calcMotorPrice ?? 5500,
        calcNoDrillPrice: dto.calcNoDrillPrice ?? 400,
        calcMinOrder: dto.calcMinOrder ?? 2500,
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
        ...(dto.title !== undefined && { title: dto.title.trim() || 'Жалюзи' }),
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
        ...(dto.comparisonShowMount !== undefined && {
          comparisonShowMount: dto.comparisonShowMount,
        }),
        ...(dto.comparisonShowMaterial !== undefined && {
          comparisonShowMaterial: dto.comparisonShowMaterial,
        }),
        ...(dto.comparisonShowControl !== undefined && {
          comparisonShowControl: dto.comparisonShowControl,
        }),
        ...(dto.comparisonShowPrice !== undefined && {
          comparisonShowPrice: dto.comparisonShowPrice,
        }),
        ...(dto.calcShow !== undefined && { calcShow: dto.calcShow }),
        ...(dto.calcTitle !== undefined && { calcTitle: emptyToNull(dto.calcTitle) }),
        ...(dto.calcNote !== undefined && { calcNote: emptyToNull(dto.calcNote) }),
        ...(dto.calcMountPrice !== undefined && { calcMountPrice: dto.calcMountPrice }),
        ...(dto.calcMotorPrice !== undefined && { calcMotorPrice: dto.calcMotorPrice }),
        ...(dto.calcNoDrillPrice !== undefined && { calcNoDrillPrice: dto.calcNoDrillPrice }),
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
    const [settings, categories] = await Promise.all([
      this.getSettings(),
      this.prisma.blindsCategory.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          products: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
        },
      }),
    ]);
    return { settings, categories };
  }
}
