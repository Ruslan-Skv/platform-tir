import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async addToCart(userId: string, productId: string, quantity: number = 1) {
    // Проверяем, существует ли товар
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Проверяем, есть ли уже товар в корзине
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        componentId: null,
      },
    });

    if (existingItem) {
      // Если товар уже в корзине, увеличиваем количество
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
          component: true,
        },
      });
    }

    // Если товара нет в корзине, создаем новый элемент
    return this.prisma.cartItem.create({
      data: {
        userId,
        productId,
        quantity,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        component: true,
      },
    });
  }

  async addComponentToCart(userId: string, componentId: string, quantity: number = 1) {
    // Проверяем, существует ли комплектующее
    const component = await this.prisma.productComponent.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      throw new NotFoundException(`ProductComponent with ID ${componentId} not found`);
    }

    // Проверяем, есть ли уже комплектующее в корзине
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        componentId,
        productId: null,
      },
    });

    if (existingItem) {
      // Если комплектующее уже в корзине, увеличиваем количество
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
        },
        include: {
          component: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          product: true,
        },
      });
    }

    // Если комплектующего нет в корзине, создаем новый элемент
    return this.prisma.cartItem.create({
      data: {
        userId,
        componentId,
        quantity,
      },
      include: {
        component: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        product: true,
      },
    });
  }

  async updateCartItemQuantity(userId: string, productId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeFromCart(userId, productId);
    }

    const item = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        componentId: null,
      },
    });

    if (!item) {
      throw new NotFoundException('Product not found in cart');
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: {
        quantity,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        component: true,
      },
    });
  }

  async updateComponentQuantity(userId: string, componentId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeComponentFromCart(userId, componentId);
    }

    const item = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        componentId,
        productId: null,
      },
    });

    if (!item) {
      throw new NotFoundException('Component not found in cart');
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: {
        quantity,
      },
      include: {
        component: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        product: true,
      },
    });
  }

  async removeFromCart(userId: string, productId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        componentId: null,
      },
    });

    if (!item) {
      throw new NotFoundException('Product not found in cart');
    }

    return this.prisma.cartItem.delete({
      where: { id: item.id },
    });
  }

  async removeComponentFromCart(userId: string, componentId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        componentId,
        productId: null,
      },
    });

    if (!item) {
      throw new NotFoundException('Component not found in cart');
    }

    return this.prisma.cartItem.delete({
      where: { id: item.id },
    });
  }

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        component: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items;
  }

  async getCartCount(userId: string) {
    const result = await this.prisma.cartItem.aggregate({
      where: { userId },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity || 0;
  }

  async clearCart(userId: string) {
    return this.prisma.cartItem.deleteMany({
      where: { userId },
    });
  }

  async getCartItems(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        component: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
