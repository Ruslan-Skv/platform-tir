import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductsSearchIndexService } from '../products-search-index.service';
import { ProductsReadService } from './products-read.service';
import {
  productCardBadgeSelectionsInclude,
  productCardVariantsInclude,
  productCreatedByUpdatedByInclude,
} from './products-includes';

@Injectable()
export class ProductsMutationsService {
  constructor(
    private prisma: PrismaService,
    private searchIndex: ProductsSearchIndexService,
    private read: ProductsReadService,
  ) {}

  async create(createProductDto: CreateProductDto, userId?: string) {
    const {
      supplierId,
      supplierProductUrl,
      supplierPrice,
      supplierSku,
      categoryId,
      partnerId,
      manufacturerId,
      coatingMaterialId,
      canvasTypeId,
      doorThicknessId,
      weatherstripId,
      cardVariants,
      catalogBadgeIds,
      ...productData
    } = createProductDto;
    const data: Prisma.ProductCreateInput = {
      ...productData,
      category: {
        connect: { id: categoryId },
      },
      ...(userId && { createdBy: { connect: { id: userId } } }),
    };
    if (manufacturerId && manufacturerId.trim()) {
      data.manufacturer = { connect: { id: manufacturerId.trim() } };
    }
    if (coatingMaterialId && coatingMaterialId.trim()) {
      data.coatingMaterial = { connect: { id: coatingMaterialId.trim() } };
    }
    if (canvasTypeId && canvasTypeId.trim()) {
      data.canvasType = { connect: { id: canvasTypeId.trim() } };
    }
    if (doorThicknessId && doorThicknessId.trim()) {
      data.doorThickness = { connect: { id: doorThicknessId.trim() } };
    }
    if (weatherstripId && weatherstripId.trim()) {
      data.weatherstrip = { connect: { id: weatherstripId.trim() } };
    }
    if (data.sizes === null) {
      data.sizes = [];
    }
    if (data.openingSide === null) {
      data.openingSide = [];
    }
    if (partnerId && partnerId.trim()) {
      data.partner = { connect: { id: partnerId } };
    }

    const product = await this.prisma.product.create({
      data,
      include: {
        category: true,
        ...productCardVariantsInclude,
        ...productCreatedByUpdatedByInclude,
      },
    });

    await this.syncProductCardBadges(product.id, catalogBadgeIds ?? []);

    if (cardVariants && cardVariants.length > 0) {
      const toCreate = cardVariants.slice(0, 5).map((v, i) => ({
        productId: product.id,
        name: v.name,
        price: new Prisma.Decimal(v.price),
        image: v.image ?? null,
        size: v.size ?? null,
        color: v.color ?? null,
        extraOption: v.extraOption ?? null,
        sortOrder: v.sortOrder ?? i,
      }));
      await this.prisma.productCardVariant.createMany({ data: toCreate });
      const withVariants = await this.prisma.product.findUnique({
        where: { id: product.id },
        include: { category: true, ...productCardVariantsInclude },
      });
      if (withVariants) await this.searchIndex.indexProduct(withVariants);
    }

    if (supplierId) {
      await this.prisma.productSupplier.updateMany({
        where: { productId: product.id },
        data: { isMainSupplier: false },
      });

      await this.prisma.productSupplier.upsert({
        where: {
          productId_supplierId: {
            productId: product.id,
            supplierId: supplierId,
          },
        },
        create: {
          productId: product.id,
          supplierId: supplierId,
          supplierSku: this.normalizeSupplierSku(supplierSku),
          supplierPrice: supplierPrice ? new Prisma.Decimal(supplierPrice) : product.price,
          supplierProductUrl: supplierProductUrl || null,
          supplierStock: product.stock || 0,
          isMainSupplier: true,
        },
        update: {
          isMainSupplier: true,
          ...(supplierSku !== undefined && {
            supplierSku: this.normalizeSupplierSku(supplierSku),
          }),
          ...(supplierPrice !== undefined && { supplierPrice: new Prisma.Decimal(supplierPrice) }),
          ...(supplierProductUrl !== undefined && {
            supplierProductUrl: supplierProductUrl || null,
          }),
        },
      });
    }

    await this.searchIndex.indexProduct(product);

    const createdFull = await this.prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        ...productCardVariantsInclude,
        ...productCardBadgeSelectionsInclude,
        ...productCreatedByUpdatedByInclude,
      },
    });
    return createdFull ?? product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, userId?: string) {
    await this.read.findOne(id);

    const {
      supplierId,
      supplierProductUrl,
      supplierPrice,
      supplierSku,
      categoryId,
      partnerId,
      manufacturerId,
      coatingMaterialId,
      canvasTypeId,
      doorThicknessId,
      weatherstripId,
      cardVariants,
      catalogBadgeIds,
      ...productData
    } = updateProductDto;
    const data: Prisma.ProductUpdateInput = {
      ...productData,
      ...(userId && { updatedBy: { connect: { id: userId } } }),
    };

    if (manufacturerId !== undefined) {
      data.manufacturer = manufacturerId
        ? { connect: { id: manufacturerId } }
        : { disconnect: true };
    }

    if (coatingMaterialId !== undefined) {
      data.coatingMaterial = coatingMaterialId
        ? { connect: { id: coatingMaterialId } }
        : { disconnect: true };
    }

    if (canvasTypeId !== undefined) {
      data.canvasType = canvasTypeId ? { connect: { id: canvasTypeId } } : { disconnect: true };
    }

    if (doorThicknessId !== undefined) {
      data.doorThickness = doorThicknessId
        ? { connect: { id: doorThicknessId } }
        : { disconnect: true };
    }

    if (weatherstripId !== undefined) {
      data.weatherstrip = weatherstripId
        ? { connect: { id: weatherstripId } }
        : { disconnect: true };
    }

    if (categoryId !== undefined) {
      data.category = {
        connect: { id: categoryId },
      };
    }

    if ('attributes' in updateProductDto) {
      data.attributes = updateProductDto.attributes ?? {};
    }

    if ('sizes' in updateProductDto) {
      data.sizes = updateProductDto.sizes === null ? [] : updateProductDto.sizes;
    }
    if ('openingSide' in updateProductDto) {
      data.openingSide = updateProductDto.openingSide === null ? [] : updateProductDto.openingSide;
    }
    if ('partnerId' in updateProductDto) {
      data.partner =
        partnerId && partnerId.trim() ? { connect: { id: partnerId } } : { disconnect: true };
    }

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        ...productCardVariantsInclude,
        ...productCardBadgeSelectionsInclude,
        ...productCreatedByUpdatedByInclude,
      },
    });

    if ('cardVariants' in updateProductDto) {
      await this.prisma.productCardVariant.deleteMany({ where: { productId: id } });
      const list = cardVariants ?? [];
      if (list.length > 0) {
        const toCreate = list.slice(0, 5).map((v, i) => ({
          productId: id,
          name: v.name,
          price: new Prisma.Decimal(v.price),
          image: v.image ?? null,
          size: v.size ?? null,
          color: v.color ?? null,
          extraOption: v.extraOption ?? null,
          sortOrder: v.sortOrder ?? i,
        }));
        await this.prisma.productCardVariant.createMany({ data: toCreate });
      }
    }

    if (
      'supplierId' in updateProductDto ||
      'supplierProductUrl' in updateProductDto ||
      'supplierPrice' in updateProductDto ||
      'supplierSku' in updateProductDto
    ) {
      if (supplierId) {
        await this.prisma.productSupplier.updateMany({
          where: { productId: id },
          data: { isMainSupplier: false },
        });

        await this.prisma.productSupplier.upsert({
          where: {
            productId_supplierId: {
              productId: id,
              supplierId: supplierId,
            },
          },
          create: {
            productId: id,
            supplierId: supplierId,
            supplierSku: this.normalizeSupplierSku(supplierSku),
            supplierPrice: supplierPrice ? new Prisma.Decimal(supplierPrice) : product.price,
            supplierProductUrl: supplierProductUrl || null,
            supplierStock: product.stock || 0,
            isMainSupplier: true,
          },
          update: {
            isMainSupplier: true,
            ...(supplierSku !== undefined && {
              supplierSku: this.normalizeSupplierSku(supplierSku),
            }),
            ...(supplierPrice !== undefined && {
              supplierPrice: new Prisma.Decimal(supplierPrice),
            }),
            ...(supplierProductUrl !== undefined && {
              supplierProductUrl: supplierProductUrl || null,
            }),
          },
        });
      } else if (
        supplierProductUrl !== undefined ||
        supplierPrice !== undefined ||
        supplierSku !== undefined
      ) {
        const mainSupplier = await this.prisma.productSupplier.findFirst({
          where: {
            productId: id,
            isMainSupplier: true,
          },
        });

        if (mainSupplier) {
          await this.prisma.productSupplier.update({
            where: { id: mainSupplier.id },
            data: {
              ...(supplierSku !== undefined && {
                supplierSku: this.normalizeSupplierSku(supplierSku),
              }),
              ...(supplierPrice !== undefined && {
                supplierPrice: new Prisma.Decimal(supplierPrice),
              }),
              ...(supplierProductUrl !== undefined && {
                supplierProductUrl: supplierProductUrl || null,
              }),
            },
          });
        }
      } else {
        await this.prisma.productSupplier.deleteMany({
          where: {
            productId: id,
            isMainSupplier: true,
          },
        });
      }
    }

    if (catalogBadgeIds !== undefined) {
      await this.syncProductCardBadges(id, catalogBadgeIds ?? []);
    }

    const toReturn = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
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
        ...productCardVariantsInclude,
        ...productCardBadgeSelectionsInclude,
        ...productCreatedByUpdatedByInclude,
      },
    });
    if (toReturn) await this.searchIndex.indexProduct(toReturn);
    return toReturn ?? product;
  }

  async remove(id: string) {
    await this.read.findOne(id);

    await this.prisma.productSupplier.deleteMany({
      where: { productId: id },
    });

    await this.prisma.product.delete({
      where: { id },
    });

    await this.searchIndex.deleteProduct(id);
  }

  private normalizeSupplierSku(value: string | null | undefined): string {
    if (value == null) return '';
    return String(value).trim();
  }

  private async syncProductCardBadges(productId: string, badgeIds: string[] | undefined | null) {
    if (badgeIds === undefined) {
      return;
    }
    const list = badgeIds ?? [];
    const unique = [...new Set(list.filter((id) => typeof id === 'string' && id.trim()))];
    if (unique.length > 5) {
      throw new BadRequestException('На один товар можно назначить не более 5 бэйджей карточки');
    }
    await this.prisma.productCardBadgeOnProduct.deleteMany({ where: { productId } });
    if (unique.length === 0) {
      return;
    }
    const defs = await this.prisma.productCardBadgeDefinition.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    if (defs.length !== unique.length) {
      throw new BadRequestException('Указан неизвестный идентификатор бэйджа карточки');
    }
    await this.prisma.productCardBadgeOnProduct.createMany({
      data: unique.map((badgeId, i) => ({
        productId,
        badgeId,
        sortOrder: i,
      })),
    });
  }
}
