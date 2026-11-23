import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { extname } from 'path';
import { PrismaService } from '../../database/prisma.service';
import { CreateFurnitureCategoryDto } from './dto/create-furniture-category.dto';
import { UpdateFurnitureCategoryDto } from './dto/update-furniture-category.dto';
import { CreateFurnitureProductDto } from './dto/create-furniture-product.dto';
import { UpdateFurnitureProductDto } from './dto/update-furniture-product.dto';
import { UpdateFurnitureSettingsDto } from './dto/update-furniture-settings.dto';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';
import { ProductCharacteristicItemDto } from './dto/create-furniture-product.dto';
import { FaqItemDto, StepItemDto, MaterialItemDto } from './dto/update-furniture-settings.dto';

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

function toMaterialsJson(items?: MaterialItemDto[]): Prisma.InputJsonValue | undefined {
  if (!items) return undefined;
  return items.map((item) => ({ name: item.name, description: item.description }));
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
export class FurnitureService {
  constructor(private prisma: PrismaService) {}

  async uploadImage(file: Express.Multer.File, baseUrl: string): Promise<{ imageUrl: string }> {
    if (!file?.path) {
      throw new ConflictException('Файл не загружен');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'furniture');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = extname(file.originalname) || '.jpg';
    const filename = `furniture-${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destPath);
    const imageUrl = `/uploads/furniture/${filename}`;
    const prefix = uploadsBaseUrl(baseUrl);
    return { imageUrl: `${prefix}${imageUrl}` };
  }

  // ===== Категории изделий =====

  async findCategories() {
    return this.prisma.furnitureCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  async findCategory(id: string) {
    const category = await this.prisma.furnitureCategory.findUnique({
      where: { id },
      include: { products: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
    });
    if (!category) {
      throw new NotFoundException(`Категория мебели "${id}" не найдена`);
    }
    return category;
  }

  async createCategory(dto: CreateFurnitureCategoryDto) {
    const existing = await this.prisma.furnitureCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Категория с slug "${dto.slug}" уже существует`);
    }
    return this.prisma.furnitureCategory.create({
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

  async updateCategory(id: string, dto: UpdateFurnitureCategoryDto) {
    await this.findCategory(id);
    if (dto.slug) {
      const existing = await this.prisma.furnitureCategory.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Категория с slug "${dto.slug}" уже существует`);
      }
    }
    return this.prisma.furnitureCategory.update({
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
    return this.prisma.furnitureCategory.delete({ where: { id } });
  }

  // ===== Изделия =====

  async findProducts(categoryId?: string) {
    return this.prisma.furnitureProduct.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findProduct(id: string) {
    const product = await this.prisma.furnitureProduct.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    if (!product) {
      throw new NotFoundException(`Изделие мебели "${id}" не найдено`);
    }
    return product;
  }

  async createProduct(dto: CreateFurnitureProductDto) {
    const category = await this.prisma.furnitureCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Категория "${dto.categoryId}" не найдена`);
    }
    const existing = await this.prisma.furnitureProduct.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Изделие с slug "${dto.slug}" уже существует`);
    }
    return this.prisma.furnitureProduct.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug: dto.slug,
        tagline: emptyToNull(dto.tagline) ?? null,
        description: dto.description,
        imageUrl: emptyToNull(dto.imageUrl) ?? null,
        videoUrl: emptyToNull(dto.videoUrl) ?? null,
        configuration: emptyToNull(dto.configuration) ?? null,
        facadeMaterial: emptyToNull(dto.facadeMaterial) ?? null,
        hardware: emptyToNull(dto.hardware) ?? null,
        characteristics: toCharacteristicJson(dto.characteristics),
        advantages: dto.advantages ?? [],
        priceFrom: dto.priceFrom ?? null,
        priceUnit: emptyToNull(dto.priceUnit) ?? null,
        badge: emptyToNull(dto.badge) ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async updateProduct(id: string, dto: UpdateFurnitureProductDto) {
    await this.findProduct(id);
    if (dto.categoryId) {
      const category = await this.prisma.furnitureCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Категория "${dto.categoryId}" не найдена`);
      }
    }
    if (dto.slug) {
      const existing = await this.prisma.furnitureProduct.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Изделие с slug "${dto.slug}" уже существует`);
      }
    }
    return this.prisma.furnitureProduct.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.tagline !== undefined && { tagline: emptyToNull(dto.tagline) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: emptyToNull(dto.imageUrl) }),
        ...(dto.videoUrl !== undefined && { videoUrl: emptyToNull(dto.videoUrl) }),
        ...(dto.configuration !== undefined && { configuration: emptyToNull(dto.configuration) }),
        ...(dto.facadeMaterial !== undefined && {
          facadeMaterial: emptyToNull(dto.facadeMaterial),
        }),
        ...(dto.hardware !== undefined && { hardware: emptyToNull(dto.hardware) }),
        ...(dto.characteristics !== undefined && {
          characteristics: toCharacteristicJson(dto.characteristics),
        }),
        ...(dto.advantages !== undefined && { advantages: dto.advantages }),
        ...(dto.priceFrom !== undefined && { priceFrom: dto.priceFrom }),
        ...(dto.priceUnit !== undefined && { priceUnit: emptyToNull(dto.priceUnit) }),
        ...(dto.badge !== undefined && { badge: emptyToNull(dto.badge) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      } as Prisma.FurnitureProductUncheckedUpdateInput,
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  async removeProduct(id: string) {
    await this.findProduct(id);
    return this.prisma.furnitureProduct.delete({ where: { id } });
  }

  // ===== Настройки раздела =====

  async getSettings() {
    const settings = await this.prisma.furniturePageBlock.findUnique({
      where: { id: 'main' },
    });
    // Возвращаем дефолты, пока админ не сохранил свои настройки
    return (
      settings ?? {
        id: 'main',
        title: 'Мебель',
        subtitle: null,
        description: null,
        heroImageUrl: null,
        seoTitle: null,
        seoDescription: null,
        comparisonShow: true,
        comparisonTitle: null,
        comparisonNote: null,
        comparisonShowConfiguration: true,
        comparisonShowFacade: true,
        comparisonShowHardware: true,
        comparisonShowPrice: true,
        materialsShow: true,
        materialsTitle: null,
        materials: null,
        calcShow: true,
        calcTitle: null,
        calcNote: null,
        calcAssemblyPrice: 3000,
        calcDeliveryPrice: 1500,
        calcPremiumHardwarePrice: 5900,
        calcMinOrder: 15000,
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

  async updateSettings(dto: UpdateFurnitureSettingsDto) {
    return this.prisma.furniturePageBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        title: dto.title?.trim() || 'Мебель',
        subtitle: emptyToNull(dto.subtitle) ?? null,
        description: emptyToNull(dto.description) ?? null,
        heroImageUrl: emptyToNull(dto.heroImageUrl) ?? null,
        seoTitle: emptyToNull(dto.seoTitle) ?? null,
        seoDescription: emptyToNull(dto.seoDescription) ?? null,
        comparisonShow: dto.comparisonShow ?? true,
        comparisonTitle: emptyToNull(dto.comparisonTitle) ?? null,
        comparisonNote: emptyToNull(dto.comparisonNote) ?? null,
        comparisonShowConfiguration: dto.comparisonShowConfiguration ?? true,
        comparisonShowFacade: dto.comparisonShowFacade ?? true,
        comparisonShowHardware: dto.comparisonShowHardware ?? true,
        comparisonShowPrice: dto.comparisonShowPrice ?? true,
        materialsShow: dto.materialsShow ?? true,
        materialsTitle: emptyToNull(dto.materialsTitle) ?? null,
        materials: toMaterialsJson(dto.materials),
        calcShow: dto.calcShow ?? true,
        calcTitle: emptyToNull(dto.calcTitle) ?? null,
        calcNote: emptyToNull(dto.calcNote) ?? null,
        calcAssemblyPrice: dto.calcAssemblyPrice ?? 3000,
        calcDeliveryPrice: dto.calcDeliveryPrice ?? 1500,
        calcPremiumHardwarePrice: dto.calcPremiumHardwarePrice ?? 5900,
        calcMinOrder: dto.calcMinOrder ?? 15000,
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
        ...(dto.title !== undefined && { title: dto.title.trim() || 'Мебель' }),
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
        ...(dto.comparisonShowConfiguration !== undefined && {
          comparisonShowConfiguration: dto.comparisonShowConfiguration,
        }),
        ...(dto.comparisonShowFacade !== undefined && {
          comparisonShowFacade: dto.comparisonShowFacade,
        }),
        ...(dto.comparisonShowHardware !== undefined && {
          comparisonShowHardware: dto.comparisonShowHardware,
        }),
        ...(dto.comparisonShowPrice !== undefined && {
          comparisonShowPrice: dto.comparisonShowPrice,
        }),
        ...(dto.materialsShow !== undefined && { materialsShow: dto.materialsShow }),
        ...(dto.materialsTitle !== undefined && {
          materialsTitle: emptyToNull(dto.materialsTitle),
        }),
        ...(dto.materials !== undefined && { materials: toMaterialsJson(dto.materials) }),
        ...(dto.calcShow !== undefined && { calcShow: dto.calcShow }),
        ...(dto.calcTitle !== undefined && { calcTitle: emptyToNull(dto.calcTitle) }),
        ...(dto.calcNote !== undefined && { calcNote: emptyToNull(dto.calcNote) }),
        ...(dto.calcAssemblyPrice !== undefined && {
          calcAssemblyPrice: dto.calcAssemblyPrice,
        }),
        ...(dto.calcDeliveryPrice !== undefined && {
          calcDeliveryPrice: dto.calcDeliveryPrice,
        }),
        ...(dto.calcPremiumHardwarePrice !== undefined && {
          calcPremiumHardwarePrice: dto.calcPremiumHardwarePrice,
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
    const [settings, categories] = await Promise.all([
      this.getSettings(),
      this.prisma.furnitureCategory.findMany({
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
