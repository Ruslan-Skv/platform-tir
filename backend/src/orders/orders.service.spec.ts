import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';
import { OrderMailService } from './order-mail.service';
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
    cartServiceItem: { delete: jest.fn() },
    orderItem: { findMany: jest.fn() },
    orderServiceItem: { createMany: jest.fn(), deleteMany: jest.fn() },
  };

  const mockCartService = {
    getCartItems: jest.fn(),
    getCartServiceItems: jest.fn(),
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
        { provide: CartService, useValue: mockCartService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: OrderMailService, useValue: mockOrderMailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('submitFromCart', () => {
    it('выбрасывает BadRequestException, если корзина пуста (нет ни товаров, ни услуг)', async () => {
      mockCartService.getCartItems.mockResolvedValue([]);
      mockCartService.getCartServiceItems.mockResolvedValue([]);

      await expect(service.submitFromCart('user-id')).rejects.toThrow(BadRequestException);
      await expect(service.submitFromCart('user-id')).rejects.toThrow('Корзина пуста');
    });

    it('выбрасывает BadRequestException, если в корзине нет позиций для заказа', async () => {
      mockCartService.getCartItems.mockResolvedValue([
        { id: 'ci-1', productId: null, product: null, componentId: null, component: null },
      ]);
      mockCartService.getCartServiceItems.mockResolvedValue([]);

      await expect(service.submitFromCart('user-id')).rejects.toThrow(BadRequestException);
      await expect(service.submitFromCart('user-id')).rejects.toThrow(
        'В корзине нет позиций для заказа',
      );
    });

    it('создаёт заказ со статусом PENDING_REVIEW при корзине только из услуг', async () => {
      const categoryId = 'cat-1';
      const itemId = 'srv-item-1';
      mockCartService.getCartItems.mockResolvedValue([]);
      mockCartService.getCartServiceItems.mockResolvedValue([
        {
          id: 'csi-1',
          userId: 'user-id',
          serviceCatalogCategoryId: categoryId,
          items: [{ itemId, quantity: 2 }],
          category: { id: categoryId, name: 'Уборка', slug: 'uborka' },
        },
      ]);

      (mockPrisma.serviceCatalogItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: itemId,
          name: 'Уборка квартиры',
          unit: 'м²',
          price: 500,
          isActive: true,
          category: { name: 'Уборка' },
        },
      ]);
      (mockPrisma.cartServiceItem.delete as jest.Mock).mockResolvedValue({});
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'admin-1' }]);

      const createdOrder = {
        id: 'order-1',
        orderNumber: 'ORD-123',
        userId: 'user-id',
        status: 'PENDING_REVIEW',
        subtotal: 1000,
        total: 1000,
        orderServiceItems: [
          {
            serviceCatalogItemId: itemId,
            name: 'Уборка квартиры',
            categoryName: 'Уборка',
            quantity: 2,
            price: 500,
            amount: 1000,
          },
        ],
      };
      (mockPrisma.order.create as jest.Mock).mockResolvedValue(createdOrder);

      const result = await service.submitFromCart('user-id', undefined, 'USER');

      expect(result).toEqual(createdOrder);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-id',
            status: 'PENDING_REVIEW',
            subtotal: 1000,
            total: 1000,
            orderServiceItems: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  serviceCatalogItemId: itemId,
                  name: 'Уборка квартиры',
                  categoryName: 'Уборка',
                  quantity: 2,
                  price: 500,
                  amount: 1000,
                }),
              ]),
            },
          }),
        }),
      );
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
