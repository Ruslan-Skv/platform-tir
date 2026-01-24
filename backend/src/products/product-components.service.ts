import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProductComponentDto } from './dto/create-product-component.dto';
import { UpdateProductComponentDto } from './dto/update-product-component.dto';

@Injectable()
export class ProductComponentsService {
  constructor(private prisma: PrismaService) {}

  async create(productId: string, createDto: CreateProductComponentDto) {
    // Проверяем, существует ли товар
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.prisma.productComponent.create({
      data: {
        ...createDto,
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findAll(productId?: string) {
    const where = productId ? { productId, isActive: true } : { isActive: true };

    return this.prisma.productComponent.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findAllAdmin(productId?: string) {
    const where = productId ? { productId } : {};

    return this.prisma.productComponent.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const component = await this.prisma.productComponent.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!component) {
      throw new NotFoundException(`ProductComponent with ID ${id} not found`);
    }

    return component;
  }

  async update(id: string, updateDto: UpdateProductComponentDto) {
    await this.findOne(id);

    try {
      return await this.prisma.productComponent.update({
        where: { id },
        data: updateDto,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.productComponent.delete({
      where: { id },
    });
  }

  async findByProductId(productId: string) {
    return this.prisma.productComponent.findMany({
      where: {
        productId,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }
}
