import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { serviceCatalogPriceWithMarkup } from '../common/utils/service-catalog-price';
import {
  effectiveServiceCatalogMarkupPercent,
  loadServiceCatalogCategoryMarkupMap,
} from '../common/utils/service-catalog-markup-effective';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async addToCart(
    userId: string,
    productId: string,
    quantity: number = 1,
    size?: string,
    openingSide?: string,
    cardVariantId?: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (cardVariantId) {
      const variant = await this.prisma.productCardVariant.findFirst({
        where: { id: cardVariantId, productId },
      });
      if (!variant) {
        throw new NotFoundException(`Card variant ${cardVariantId} not found for this product`);
      }
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        componentId: null,
        cardVariantId: cardVariantId || null,
        size: size || null,
        openingSide: openingSide || null,
      },
    });

    if (existingItem) {
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
          cardVariant: true,
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        userId,
        productId,
        quantity,
        size: size || null,
        openingSide: openingSide || null,
        cardVariantId: cardVariantId || null,
      },
      include: {
        product: {
          include: {
            category: true,
            coatingMaterial: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        component: true,
        cardVariant: true,
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

  async updateCartItemQuantityById(userId: string, itemId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeCartItemById(userId, itemId);
    }

    // Проверяем, что элемент корзины принадлежит пользователю
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity,
      },
      include: {
        product: {
          include: {
            category: true,
            coatingMaterial: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        component: true,
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
            coatingMaterial: {
              select: { id: true, name: true, slug: true },
            },
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

  async removeCartItemById(userId: string, itemId: string) {
    // Проверяем, что элемент корзины принадлежит пользователю
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.delete({
      where: { id: itemId },
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
            coatingMaterial: {
              select: { id: true, name: true, slug: true },
            },
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
        cardVariant: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return items;
  }

  async getCartServiceItems(userId: string) {
    const rows = await this.prisma.cartServiceItem.findMany({
      where: { userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allLineItemIds = new Set<string>();
    const parsedRows: Array<{
      row: (typeof rows)[0];
      rawRooms: Array<{
        name: string;
        items: { itemId?: string; item_id?: string; quantity: number }[];
      }>;
    }> = [];

    for (const r of rows) {
      const raw = r.items as
        | { itemId?: string; item_id?: string; quantity: number }[]
        | {
            rooms?: Array<{
              name?: string;
              items: { itemId?: string; item_id?: string; quantity: number }[];
            }>;
          }
        | null;
      const rawRooms = Array.isArray(raw)
        ? [{ name: 'Помещение', items: raw }]
        : (raw?.rooms ?? []).map((room) => ({
            name: room.name ?? 'Помещение',
            items: Array.isArray(room.items) ? room.items : [],
          }));
      for (const room of rawRooms) {
        for (const li of room.items ?? []) {
          const id = li.itemId ?? li.item_id;
          if (id != null) allLineItemIds.add(String(id));
        }
      }
      parsedRows.push({ row: r, rawRooms });
    }

    const catalogMap = new Map<
      string,
      {
        name: string;
        unit: string;
        price: Prisma.Decimal;
        categoryId: string;
      }
    >();
    let categoryMarkupMap = new Map<
      string,
      { parentId: string | null; priceMarkupPercent: Prisma.Decimal }
    >();
    if (allLineItemIds.size > 0) {
      const dbItems = await this.prisma.serviceCatalogItem.findMany({
        where: { id: { in: [...allLineItemIds] } },
        select: {
          id: true,
          name: true,
          unit: true,
          price: true,
          categoryId: true,
        },
      });
      categoryMarkupMap = await loadServiceCatalogCategoryMarkupMap(this.prisma, [
        ...new Set(dbItems.map((i) => i.categoryId)),
      ]);
      for (const row of dbItems) {
        catalogMap.set(row.id, {
          name: row.name,
          unit: row.unit,
          price: row.price,
          categoryId: row.categoryId,
        });
      }
    }

    return parsedRows.map(({ row: r, rawRooms }) => {
      let total = 0;
      const roomsWithDetails = rawRooms.map((room) => {
        let roomTotal = 0;
        const itemsWithDetails = (room.items ?? [])
          .filter((i) => (i.itemId ?? i.item_id) != null)
          .map((i) => {
            const itemId = String(i.itemId ?? i.item_id);
            const cat = catalogMap.get(itemId);
            const quantity = Math.max(0, Number(i.quantity) || 0);
            const price =
              cat?.price != null
                ? serviceCatalogPriceWithMarkup(
                    cat.price,
                    effectiveServiceCatalogMarkupPercent(cat.categoryId, categoryMarkupMap),
                  )
                : 0;
            const amount = price * quantity;
            roomTotal += amount;
            total += amount;
            return {
              itemId,
              quantity,
              name: cat?.name ?? '—',
              unit: cat?.unit ?? '—',
              price,
              amount,
            };
          })
          .filter((i) => i.quantity > 0);
        return { name: room.name || 'Помещение', items: itemsWithDetails, total: roomTotal };
      });
      const itemsWithDetails = roomsWithDetails.flatMap((room) => room.items);
      const { category, ...rest } = r;
      return {
        ...rest,
        category,
        itemsWithDetails,
        rooms: rawRooms.map((room) => ({
          name: room.name || 'Помещение',
          items: room.items,
        })),
        roomsWithDetails,
        total,
      };
    });
  }

  async addServiceSelectionToCart(
    userId: string,
    serviceCatalogCategoryId: string,
    items: { itemId: string; quantity: number }[],
    rooms?: { name: string; items: { itemId: string; quantity: number }[] }[],
  ) {
    const category = await this.prisma.serviceCatalogCategory.findUnique({
      where: { id: serviceCatalogCategoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Service catalog category with ID ${serviceCatalogCategoryId} not found`,
      );
    }
    const hasRooms = Array.isArray(rooms) && rooms.length > 0;
    if (!items.length && !hasRooms) {
      throw new NotFoundException('Добавьте хотя бы одну позицию услуг');
    }

    const payload = hasRooms ? { rooms } : (items as unknown as object);
    const upsertArgs = {
      where: {
        userId_serviceCatalogCategoryId: { userId, serviceCatalogCategoryId },
      },
      create: {
        userId,
        serviceCatalogCategoryId,
        items: payload as unknown as object,
      },
      update: {
        items: payload as unknown as object,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    } as const;

    try {
      return await this.prisma.cartServiceItem.upsert(upsertArgs);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.cartServiceItem.update({
          where: {
            userId_serviceCatalogCategoryId: { userId, serviceCatalogCategoryId },
          },
          data: { items: payload as unknown as object },
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        });
      }
      throw error;
    }
  }

  async removeCartServiceItemById(userId: string, itemId: string) {
    const item = await this.prisma.cartServiceItem.findFirst({
      where: { id: itemId, userId },
    });
    if (!item) {
      throw new NotFoundException('Cart service item not found');
    }
    return this.prisma.cartServiceItem.delete({
      where: { id: itemId },
    });
  }

  async getCartCount(userId: string) {
    const [productResult, serviceCount] = await Promise.all([
      this.prisma.cartItem.aggregate({
        where: { userId },
        _sum: { quantity: true },
      }),
      this.prisma.cartServiceItem.count({ where: { userId } }),
    ]);
    const productQty = productResult._sum.quantity || 0;
    return Math.round(productQty) + serviceCount;
  }

  async clearCart(userId: string) {
    await Promise.all([
      this.prisma.cartItem.deleteMany({ where: { userId } }),
      this.prisma.cartServiceItem.deleteMany({ where: { userId } }),
    ]);
  }

  async getCartItems(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            coatingMaterial: {
              select: { id: true, name: true, slug: true },
            },
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
        cardVariant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
