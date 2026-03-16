import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from './users.service';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findOne', () => {
    it('выбрасывает NotFoundException, если пользователь не найден', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'User with ID non-existent-id not found',
      );
    });

    it('возвращает пользователя без пароля при найденном id', async () => {
      const user = {
        id: 'u1',
        email: 'user@test.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        isGuest: false,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      const result = await service.findOne('u1');
      expect(result).toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' } }),
      );
    });
  });

  describe('findByEmail', () => {
    it('нормализует email и ищет без учёта регистра', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await service.findByEmail('  User@Test.COM  ');
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: { equals: 'user@test.com', mode: 'insensitive' } },
        }),
      );
    });
  });

  describe('create', () => {
    it('хеширует пароль перед созданием', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      const created = {
        id: 'u-new',
        email: 'new@test.com',
        firstName: 'New',
        lastName: 'User',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(created);

      await service.create({
        email: 'new@test.com',
        password: 'plain-password',
        firstName: 'New',
        lastName: 'User',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@test.com',
            password: 'hashed-password',
            firstName: 'New',
            lastName: 'User',
          }),
        }),
      );
    });
  });
});
