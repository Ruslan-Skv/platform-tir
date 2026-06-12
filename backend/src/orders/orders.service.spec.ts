import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { OrderMailService } from './services/order-mail.service';
import { OrdersCartCheckoutService } from './services/orders-cart-checkout.service';
import { OrdersDeliveryService } from './services/orders-delivery.service';
import { OrdersServiceOrdersService } from './services/orders-service-orders.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockPrisma = {
    product: { findMany: jest.fn() },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    deliveryConfig: { findFirst: jest.fn(), create: jest.fn() },
    shippingMethod: { findFirst: jest.fn() },
    orderEvent: { create: jest.fn() },
    address: { create: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    serviceCatalogItem: { findMany: jest.fn() },
    serviceCatalogCategory: { findMany: jest.fn() },
    cartServiceItem: { delete: jest.fn() },
    orderItem: { findMany: jest.fn() },
    orderServiceItem: { createMany: jest.fn(), deleteMany: jest.fn() },
  };

  const mockCartCheckout = {
    submitFromCart: jest.fn(),
    submitFromCartForCustomer: jest.fn(),
    addCartItemToOrder: jest.fn(),
  };

  const mockOrdersDelivery = {
    getDeliverySettlements: jest.fn(),
    getShippingMethods: jest.fn(),
    calculateDelivery: jest.fn(),
    getDeliveryConfig: jest.fn(),
    getBaseDeliveryCost: jest.fn(),
  };

  const mockOrdersServiceOrders = {
    canPlaceServiceOrder: jest.fn(),
    createServiceOrder: jest.fn(),
    updateServiceOrderCustomer: jest.fn(),
  };

  const mockUsersService = {
    createNotification: jest.fn(),
  };

  const mockOrderMailService = {
    sendOrderApprovedEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsersService },
        { provide: OrderMailService, useValue: mockOrderMailService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OrdersDeliveryService, useValue: mockOrdersDelivery },
        { provide: OrdersServiceOrdersService, useValue: mockOrdersServiceOrders },
        { provide: OrdersCartCheckoutService, useValue: mockCartCheckout },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('submitFromCart', () => {
    it('делегирует оформление корзины в OrdersCartCheckoutService', async () => {
      const createdOrder = { id: 'order-1', status: 'PENDING_REVIEW' };
      mockCartCheckout.submitFromCart.mockResolvedValue(createdOrder);

      const result = await service.submitFromCart('user-id', { cartItemIds: ['ci-1'] }, 'USER');

      expect(mockCartCheckout.submitFromCart).toHaveBeenCalledWith(
        'user-id',
        { cartItemIds: ['ci-1'] },
        'USER',
      );
      expect(result).toEqual(createdOrder);
    });

    it('пробрасывает ошибки checkout-сервиса', async () => {
      mockCartCheckout.submitFromCart.mockRejectedValue(new BadRequestException('Корзина пуста'));

      await expect(service.submitFromCart('user-id')).rejects.toThrow(BadRequestException);
      await expect(service.submitFromCart('user-id')).rejects.toThrow('Корзина пуста');
    });
  });

  describe('create', () => {
    it('создаёт заказ с корректной суммой по товарам', async () => {
      const productId = 'prod-1';
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: productId, price: 1500 },
      ]);

      const createdOrder = {
        id: 'order-1',
        orderNumber: 'ORD-123',
        userId: 'user-id',
        status: 'PENDING',
        subtotal: 3000,
        total: 3500,
        shippingCost: 500,
      };
      (mockPrisma.order.create as jest.Mock).mockResolvedValue(createdOrder);

      const result = await service.create('user-id', {
        shippingAddressId: 'addr-1',
        items: [{ productId, quantity: 2 }],
        shippingCost: 500,
      });

      expect(result).toEqual(createdOrder);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-id',
            status: 'PENDING',
            subtotal: 3000,
            shippingCost: 500,
            total: 3500,
            items: {
              create: [
                expect.objectContaining({
                  productId,
                  quantity: 2,
                  price: 1500,
                }),
              ],
            },
          }),
        }),
      );
    });
  });
});
