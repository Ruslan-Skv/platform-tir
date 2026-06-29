import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../database/prisma.service';
import { uploadsBaseUrl } from '../common/utils/uploads-url';
import { CreatePublicOfferDto } from './dto/create-public-offer.dto';
import { ResolvePublicOffersDto } from './dto/resolve-public-offers.dto';
import { UpdatePublicOfferDto } from './dto/update-public-offer.dto';
import type { PublicOfferScopeDto } from './dto/public-offer-scope.dto';
import {
  PUBLIC_OFFER_SCOPE_TYPES,
  type PublicOfferData,
  type PublicOfferListItem,
  type PublicOfferScopeInput,
  type PublicOfferScopeType,
} from './public-offer.types';

const DEFAULT_ACCEPT_TEXT = 'Я принимаю условия публичной оферты';

type OfferWithScopes = {
  id: string;
  slug: string;
  title: string;
  name: string;
  offerUrl: string | null;
  offerContent: string | null;
  acceptText: string;
  isPublished: boolean;
  isDefault: boolean;
  sortOrder: number;
  scopes: { scopeType: string; scopeId: string }[];
};

function mapOffer(offer: OfferWithScopes): PublicOfferData {
  const offerUrl = offer.offerUrl?.trim() || null;
  const offerContent = offer.offerContent?.trim() || null;
  const title = offer.title.trim() || 'Публичная оферта';
  const name = offer.name.trim() || title;
  const acceptText = offer.acceptText.trim() || DEFAULT_ACCEPT_TEXT;

  return {
    id: offer.id,
    slug: offer.slug,
    pageTitle: title,
    name,
    offerUrl,
    offerContent,
    acceptText,
    isPublished: offer.isPublished,
    isConfigured: Boolean(offerUrl || offerContent),
    isDefault: offer.isDefault,
    sortOrder: offer.sortOrder,
    scopes: offer.scopes.map((scope) => ({
      scopeType: scope.scopeType as PublicOfferScopeType,
      scopeId: scope.scopeId || null,
    })),
  };
}

function normalizeScopes(scopes: PublicOfferScopeDto[] | undefined): PublicOfferScopeInput[] {
  if (!scopes?.length) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: PublicOfferScopeInput[] = [];

  for (const scope of scopes) {
    if (!PUBLIC_OFFER_SCOPE_TYPES.includes(scope.scopeType)) {
      throw new BadRequestException(`Неизвестный тип области: ${scope.scopeType}`);
    }

    const needsCategory =
      scope.scopeType === 'PRODUCT_CATEGORY' || scope.scopeType === 'SERVICE_CATEGORY';
    const scopeId = needsCategory ? scope.scopeId?.trim() : '';
    if (needsCategory && !scopeId) {
      throw new BadRequestException('Для области по категории нужен scopeId');
    }

    const key = `${scope.scopeType}:${scopeId ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    normalized.push({
      scopeType: scope.scopeType,
      scopeId: scopeId || null,
    });
  }

  return normalized;
}

function offerMatchesCart(
  offer: OfferWithScopes,
  productCategoryIds: Set<string>,
  serviceCategoryIds: Set<string>,
  hasProducts: boolean,
  hasServices: boolean,
): boolean {
  return offer.scopes.some((scope) => {
    if (scope.scopeType === 'ALL_PRODUCTS' && hasProducts) {
      return true;
    }
    if (scope.scopeType === 'ALL_SERVICES' && hasServices) {
      return true;
    }
    if (
      scope.scopeType === 'PRODUCT_CATEGORY' &&
      scope.scopeId &&
      productCategoryIds.has(scope.scopeId)
    ) {
      return true;
    }
    if (
      scope.scopeType === 'SERVICE_CATEGORY' &&
      scope.scopeId &&
      serviceCategoryIds.has(scope.scopeId)
    ) {
      return true;
    }
    return false;
  });
}

@Injectable()
export class PublicOfferService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOfferOrThrow(id: string): Promise<OfferWithScopes> {
    const offer = await this.prisma.publicOffer.findUnique({
      where: { id },
      include: { scopes: true },
    });
    if (!offer) {
      throw new NotFoundException('Оферта не найдена');
    }
    return offer;
  }

  private async clearOtherDefaults(exceptId?: string) {
    await this.prisma.publicOffer.updateMany({
      where: exceptId ? { isDefault: true, id: { not: exceptId } } : { isDefault: true },
      data: { isDefault: false },
    });
  }

  private async replaceScopes(offerId: string, scopes: PublicOfferScopeInput[]) {
    await this.prisma.publicOfferScope.deleteMany({ where: { offerId } });
    if (!scopes.length) {
      return;
    }
    await this.prisma.publicOfferScope.createMany({
      data: scopes.map((scope) => ({
        offerId,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId ?? '',
      })),
    });
  }

  async listPublic(): Promise<PublicOfferListItem[]> {
    const offers = await this.prisma.publicOffer.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { slug: true, title: true, name: true, offerUrl: true, offerContent: true },
    });

    return offers
      .filter((offer) => Boolean(offer.offerUrl?.trim() || offer.offerContent?.trim()))
      .map((offer) => ({
        slug: offer.slug,
        title: offer.title.trim() || 'Публичная оферта',
        name: offer.name.trim() || offer.title.trim() || 'Публичная оферта',
      }));
  }

  async getPublicBySlug(slug: string): Promise<PublicOfferData | null> {
    const offer = await this.prisma.publicOffer.findUnique({
      where: { slug },
      include: { scopes: true },
    });
    if (!offer || !offer.isPublished) {
      return null;
    }
    const mapped = mapOffer(offer);
    if (!mapped.isConfigured) {
      return null;
    }
    return mapped;
  }

  /** @deprecated Используйте getPublicBySlug или listPublic */
  async getPublicDefault(): Promise<PublicOfferData | null> {
    const offers = await this.prisma.publicOffer.findMany({
      where: { isPublished: true },
      include: { scopes: true },
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const configured = offers.map(mapOffer).filter((offer) => offer.isConfigured);
    return configured[0] ?? null;
  }

  async listAdmin(): Promise<PublicOfferData[]> {
    const offers = await this.prisma.publicOffer.findMany({
      include: { scopes: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return offers.map(mapOffer);
  }

  async getAdminById(id: string): Promise<PublicOfferData> {
    const offer = await this.findOfferOrThrow(id);
    return mapOffer(offer);
  }

  async create(dto: CreatePublicOfferDto): Promise<PublicOfferData> {
    const scopes = normalizeScopes(dto.scopes);
    const slug = dto.slug.trim().toLowerCase();

    const existing = await this.prisma.publicOffer.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException('Оферта с таким slug уже существует');
    }

    if (dto.isDefault) {
      await this.clearOtherDefaults();
    }

    const offer = await this.prisma.publicOffer.create({
      data: {
        slug,
        title: dto.title.trim(),
        name: dto.name.trim(),
        offerUrl: dto.offerUrl?.trim() || null,
        offerContent: dto.offerContent?.trim() || null,
        acceptText: dto.acceptText?.trim() || DEFAULT_ACCEPT_TEXT,
        isPublished: dto.isPublished ?? false,
        isDefault: dto.isDefault ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { scopes: true },
    });

    await this.replaceScopes(offer.id, scopes);
    return this.getAdminById(offer.id);
  }

  async update(id: string, dto: UpdatePublicOfferDto): Promise<PublicOfferData> {
    await this.findOfferOrThrow(id);

    if (dto.slug !== undefined) {
      const slug = dto.slug.trim().toLowerCase();
      const existing = await this.prisma.publicOffer.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException('Оферта с таким slug уже существует');
      }
    }

    if (dto.isDefault) {
      await this.clearOtherDefaults(id);
    }

    await this.prisma.publicOffer.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined && { slug: dto.slug.trim().toLowerCase() }),
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.offerUrl !== undefined && { offerUrl: dto.offerUrl?.trim() || null }),
        ...(dto.offerContent !== undefined && {
          offerContent: dto.offerContent?.trim() || null,
        }),
        ...(dto.acceptText !== undefined && {
          acceptText: dto.acceptText.trim() || DEFAULT_ACCEPT_TEXT,
        }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    if (dto.scopes !== undefined) {
      await this.replaceScopes(id, normalizeScopes(dto.scopes));
    }

    return this.getAdminById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOfferOrThrow(id);
    await this.prisma.publicOffer.delete({ where: { id } });
  }

  async uploadOfferPdf(
    id: string,
    file: Express.Multer.File,
    baseUrl: string,
  ): Promise<{ offerUrl: string }> {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    await this.findOfferOrThrow(id);

    const filename = path.basename(file.path);
    const offerUrl = `/uploads/offer/${filename}`;
    const prefix = uploadsBaseUrl(baseUrl);
    const fullUrl = prefix ? `${prefix}${offerUrl}` : offerUrl;

    await this.prisma.publicOffer.update({
      where: { id },
      data: { offerUrl },
    });

    return { offerUrl: fullUrl };
  }

  async resolveForCart(dto: ResolvePublicOffersDto, userId?: string): Promise<PublicOfferData[]> {
    let productCategoryIds = new Set(dto.productCategoryIds ?? []);
    let serviceCategoryIds = new Set(dto.serviceCategoryIds ?? []);
    let hasProducts = dto.hasProducts ?? productCategoryIds.size > 0;
    let hasServices = dto.hasServices ?? serviceCategoryIds.size > 0;

    if (dto.orderId) {
      if (!userId) {
        throw new ForbiddenException('Требуется авторизация');
      }
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, userId },
        include: {
          items: { include: { product: { select: { categoryId: true } } } },
          orderServiceItems: {
            include: { serviceCatalogItem: { select: { categoryId: true } } },
          },
        },
      });
      if (!order) {
        throw new NotFoundException('Заказ не найден');
      }

      productCategoryIds = new Set(
        order.items
          .map((item) => item.product?.categoryId)
          .filter((id): id is string => Boolean(id)),
      );
      serviceCategoryIds = new Set(
        order.orderServiceItems.map((item) => item.serviceCatalogItem.categoryId),
      );
      hasProducts = order.items.length > 0;
      hasServices = order.orderServiceItems.length > 0;
    }

    if (!hasProducts && !hasServices) {
      return [];
    }

    const offers = await this.prisma.publicOffer.findMany({
      where: { isPublished: true },
      include: { scopes: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const matched = offers.filter(
      (offer) =>
        mapOffer(offer).isConfigured &&
        offerMatchesCart(offer, productCategoryIds, serviceCategoryIds, hasProducts, hasServices),
    );

    if (matched.length === 0) {
      const defaultOffer = offers.find((offer) => offer.isDefault && mapOffer(offer).isConfigured);
      if (defaultOffer) {
        matched.push(defaultOffer);
      }
    }

    const unique = new Map<string, PublicOfferData>();
    for (const offer of matched) {
      unique.set(offer.id, mapOffer(offer));
    }

    return [...unique.values()];
  }
}

export const offerUploadDir = path.join(process.cwd(), 'uploads', 'offer');

export function ensureOfferUploadDir(): void {
  if (!fs.existsSync(offerUploadDir)) {
    fs.mkdirSync(offerUploadDir, { recursive: true });
  }
}
