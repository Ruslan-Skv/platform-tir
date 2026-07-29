import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  AdminOrdersDeliverySettingsService,
  DEFAULT_APPROVAL_VALID_MINUTES,
} from './admin-orders-delivery-settings.service';

const PRODUCT_ORDER_SORT_KEYS = new Set([
  'orderNumber',
  'manager',
  'customer',
  'status',
  'payment',
  'paymentStatus',
  'total',
  'createdAt',
]);

const SERVICE_ORDER_SORT_KEYS = new Set([
  'orderNumber',
  'manager',
  'customer',
  'status',
  'payment',
  'paymentStatus',
  'total',
  'createdAt',
]);

function resolveProductOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Prisma.OrderOrderByWithRelationInput | Prisma.OrderOrderByWithRelationInput[] {
  const key = PRODUCT_ORDER_SORT_KEYS.has(sortBy) ? sortBy : 'createdAt';
  switch (key) {
    case 'orderNumber':
      return { orderNumber: sortOrder };
    case 'total':
      return { total: sortOrder };
    case 'status':
      return { status: sortOrder };
    case 'payment':
    case 'paymentStatus':
      return { paymentStatus: sortOrder };
    case 'manager':
      return [
        { processedByManager: { lastName: sortOrder } },
        { processedByManager: { firstName: sortOrder } },
        { processedByManager: { email: sortOrder } },
      ];
    case 'customer':
      return [
        { customerLastName: sortOrder },
        { customerFirstName: sortOrder },
        { customerEmail: sortOrder },
        { user: { lastName: sortOrder } },
        { user: { firstName: sortOrder } },
        { user: { email: sortOrder } },
      ];
    case 'createdAt':
    default:
      return { createdAt: sortOrder };
  }
}

function resolveServiceOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): Prisma.ServiceOrderOrderByWithRelationInput | Prisma.ServiceOrderOrderByWithRelationInput[] {
  const key = SERVICE_ORDER_SORT_KEYS.has(sortBy) ? sortBy : 'createdAt';
  switch (key) {
    case 'orderNumber':
      return { orderNumber: sortOrder };
    case 'total':
      return { total: sortOrder };
    case 'status':
      return { status: sortOrder };
    case 'manager':
      return [
        { createdByManager: { lastName: sortOrder } },
        { createdByManager: { firstName: sortOrder } },
        { createdByManager: { email: sortOrder } },
      ];
    case 'customer':
      return [
        { customerLastName: sortOrder },
        { customerFirstName: sortOrder },
        { customerEmail: sortOrder },
        { user: { lastName: sortOrder } },
        { user: { firstName: sortOrder } },
        { user: { email: sortOrder } },
      ];
    case 'payment':
    case 'paymentStatus':
      // У сервисных заказов нет статуса оплаты — стабильный fallback.
      return { createdAt: sortOrder };
    case 'createdAt':
    default:
      return { createdAt: sortOrder };
  }
}

@Injectable()
export class AdminOrdersQueryService {
  constructor(
    private prisma: PrismaService,
    private deliverySettings: AdminOrdersDeliverySettingsService,
  ) {}

  async findAll(params?: {
    status?: string;
    paymentStatus?: string;
    userId?: string;
    search?: string;
    orderNumber?: string;
    customer?: string;
    manager?: string;
    dateFrom?: string;
    dateTo?: string;
    minTotal?: number;
    maxTotal?: number;
    hasDelivery?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      status,
      paymentStatus,
      userId,
      search,
      orderNumber,
      customer,
      manager,
      dateFrom,
      dateTo,
      minTotal,
      maxTotal,
      hasDelivery,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params || {};

    const skip = (page - 1) * limit;
    let where: Prisma.OrderWhereInput = { deletedAt: null };

    if (status) {
      where.status = status as Prisma.EnumOrderStatusFilter;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus as Prisma.EnumPaymentStatusFilter;
    }

    if (userId) {
      where.userId = userId;
    }

    const searchOr: Prisma.OrderWhereInput[] = [];
    if (search) {
      searchOr.push(
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerFirstName: { contains: search, mode: 'insensitive' } },
        { customerLastName: { contains: search, mode: 'insensitive' } },
        { processedByManager: { email: { contains: search, mode: 'insensitive' } } },
        { processedByManager: { firstName: { contains: search, mode: 'insensitive' } } },
        { processedByManager: { lastName: { contains: search, mode: 'insensitive' } } },
      );
    }

    const andFilters: Prisma.OrderWhereInput[] = [];
    if (orderNumber) {
      andFilters.push({
        orderNumber: { contains: orderNumber.trim(), mode: 'insensitive' },
      });
    }
    if (customer) {
      andFilters.push({
        OR: [
          { customerEmail: { contains: customer.trim(), mode: 'insensitive' } },
          { customerFirstName: { contains: customer.trim(), mode: 'insensitive' } },
          { customerLastName: { contains: customer.trim(), mode: 'insensitive' } },
          { user: { email: { contains: customer.trim(), mode: 'insensitive' } } },
          { user: { firstName: { contains: customer.trim(), mode: 'insensitive' } } },
          { user: { lastName: { contains: customer.trim(), mode: 'insensitive' } } },
        ],
      });
    }
    if (manager) {
      andFilters.push({
        OR: [
          { processedByManager: { email: { contains: manager.trim(), mode: 'insensitive' } } },
          { processedByManager: { firstName: { contains: manager.trim(), mode: 'insensitive' } } },
          { processedByManager: { lastName: { contains: manager.trim(), mode: 'insensitive' } } },
        ],
      });
    }

    if (searchOr.length > 0) {
      andFilters.push({ OR: searchOr });
    }

    if (andFilters.length > 0) {
      where = Object.keys(where).length > 0 ? { AND: [where, ...andFilters] } : { AND: andFilters };
    } else {
      if (searchOr.length > 0) {
        where.OR = searchOr;
      }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    if (minTotal !== undefined || maxTotal !== undefined) {
      where.total = {};
      if (minTotal !== undefined) {
        where.total.gte = new Prisma.Decimal(minTotal);
      }
      if (maxTotal !== undefined) {
        where.total.lte = new Prisma.Decimal(maxTotal);
      }
    }

    if (hasDelivery) {
      const deliveryOr = {
        OR: [{ shippingAddressId: { not: null } }, { shippingCost: { gt: 0 } }],
      };
      where = Object.keys(where).length > 0 ? { AND: [where, deliveryOr] } : deliveryOr;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          processedByManager: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  images: true,
                },
              },
            },
          },
          orderServiceItems: true,
          shippingAddress: true,
          shippingMethod: true,
          payments: {
            include: {
              method: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: resolveProductOrderBy(sortBy, sortOrder === 'asc' ? 'asc' : 'desc'),
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getServiceOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params || {};
    const skip = (page - 1) * limit;
    const where: Prisma.ServiceOrderWhereInput = { deletedAt: null };
    if (status) {
      where.status = status as 'PENDING' | 'CONFIRMED' | 'CANCELLED';
    }
    const [items, total] = await Promise.all([
      this.prisma.serviceOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: resolveServiceOrderBy(sortBy, sortOrder === 'asc' ? 'asc' : 'desc'),
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          createdByManager: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: true,
        },
      }),
      this.prisma.serviceOrder.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getServiceOrder(id: string) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        createdByManager: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Заказ на услуги не найден');
    }
    if (order.deletedAt) {
      throw new NotFoundException('Заказ на услуги не найден');
    }
    return order;
  }

  async findOne(id: string) {
    let order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        processedByManager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
                images: true,
              },
            },
            replacedFromProduct: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        orderServiceItems: true,
        shippingAddress: true,
        shippingMethod: true,
        payments: {
          include: {
            method: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        orderEvents: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.deletedAt) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const config = await this.deliverySettings.getDeliveryConfig();
    const approvalValidMinutes =
      (config as { approvalValidMinutes?: number }).approvalValidMinutes ??
      DEFAULT_APPROVAL_VALID_MINUTES;
    const approvalValidMs = approvalValidMinutes * 60 * 1000;
    if (
      order.status === 'APPROVED' &&
      order.approvedAt &&
      Date.now() - new Date(order.approvedAt).getTime() > approvalValidMs
    ) {
      await this.restoreStock(
        order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      );
      order = await this.prisma.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: `Время на оформление заказа истекло (${approvalValidMinutes} мин). Товары остаются в корзине.`,
          approvedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          processedByManager: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sku: true,
                  images: true,
                },
              },
              replacedFromProduct: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
          orderServiceItems: true,
          shippingAddress: true,
          shippingMethod: true,
          payments: {
            include: { method: true },
            orderBy: { createdAt: 'desc' },
          },
          orderEvents: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });
    }

    return { ...order!, approvalValidMinutes };
  }

  async restoreStock(items: Array<{ productId: string | null; quantity: number }>) {
    const rows = items.filter(
      (i): i is { productId: string; quantity: number } => i.productId != null,
    );
    if (!rows.length) return;
    await this.prisma.$transaction(
      rows.map((item) =>
        this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        }),
      ),
    );
  }
}
