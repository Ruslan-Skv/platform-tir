import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;

  const mockPrisma = {
    product: { findUnique: jest.fn() },
    productCardVariant: { findFirst: jest.fn() },
    cartItem: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    productComponent: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CartService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('addToCart', () => {
    it('выбрасывает NotFoundException, если товар не найден', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.addToCart('user-id', 'non-existent-product-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.addToCart('user-id', 'non-existent-product-id')).rejects.toThrow(
        'Product with ID non-existent-product-id not found',
      );
    });

    it('создаёт новую позицию в корзине, если такой ещё нет', async () => {
      const product = { id: 'prod-1', name: 'Product', price: 100 };
      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockPrisma.cartItem.findFirst.mockResolvedValue(null);
      const created = {
        id: 'cart-1',
        userId: 'user-id',
        productId: 'prod-1',
        quantity: 2,
        product,
      };
      mockPrisma.cartItem.create.mockResolvedValue(created);

      const result = await service.addToCart('user-id', 'prod-1', 2);

      expect(result).toEqual(created);
      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: 'user-id',
            productId: 'prod-1',
            quantity: 2,
            size: null,
            openingSide: null,
            cardVariantId: null,
          },
        }),
      );
    });

    it('увеличивает quantity существующей позиции', async () => {
      const product = { id: 'prod-1', name: 'Product', price: 100 };
      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockPrisma.cartItem.findFirst.mockResolvedValue({
        id: 'cart-1',
        userId: 'user-id',
        productId: 'prod-1',
        quantity: 1,
      });
      const updated = { id: 'cart-1', quantity: 3, product };
      mockPrisma.cartItem.update.mockResolvedValue(updated);

      const result = await service.addToCart('user-id', 'prod-1', 2);

      expect(result.quantity).toBe(3);
      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cart-1' },
          data: { quantity: 3 },
        }),
      );
    });
  });

  describe('getCartItems', () => {
    it('возвращает пустой массив, если корзина пуста', async () => {
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      const result = await service.getCartItems('user-id');
      expect(result).toEqual([]);
      expect(mockPrisma.cartItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-id' } }),
      );
    });
  });

  describe('removeCartItemById', () => {
    it('выбрасывает NotFoundException, если позиция не принадлежит пользователю', async () => {
      mockPrisma.cartItem.findFirst.mockResolvedValue(null);
      await expect(service.removeCartItemById('user-id', 'item-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeCartItemById('user-id', 'item-1')).rejects.toThrow(
        'Cart item not found',
      );
    });
  });
});
