import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { PasswordResetMailService } from './password-reset-mail.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    completeGuestRegistration: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(() => 'jwt-token'),
  };

  const mockPrisma = {
    passwordResetToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    user: { update: jest.fn() },
    userRefreshToken: {
      create: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((fns) => Promise.all(fns.map((fn: () => unknown) => fn()))),
  };

  const mockConfigService = {
    get: jest.fn((key: string, def?: string) =>
      key === 'SITE_URL' ? 'http://localhost:3000' : def,
    ),
  };

  const mockPasswordResetMail = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PasswordResetMailService, useValue: mockPasswordResetMail },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  describe('validateUser', () => {
    it('возвращает null, если пользователь не найден', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const result = await service.validateUser('unknown@test.com', 'pass');
      expect(result).toBeNull();
    });

    it('возвращает null, если пароль неверный', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        password: 'hashed',
        role: 'USER',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await service.validateUser('user@test.com', 'wrong');
      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith('wrong', 'hashed');
    });

    it('возвращает пользователя без пароля при верном пароле', async () => {
      const user = {
        id: 'u1',
        email: 'user@test.com',
        password: 'hashed',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
      };
      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.validateUser('user@test.com', 'correct');
      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('password');
      expect(result?.email).toBe('user@test.com');
    });
  });

  describe('login', () => {
    it('возвращает access_token и данные пользователя', async () => {
      const result = await service.login({
        id: 'u1',
        email: 'user@test.com',
        role: 'USER',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.access_token).toBe('jwt-token');
      expect(typeof result.refresh_token).toBe('string');
      expect(result.refresh_token.length).toBeGreaterThan(32);
      expect(result.user).toEqual(
        expect.objectContaining({
          id: 'u1',
          email: 'user@test.com',
          role: 'USER',
          firstName: 'John',
          lastName: 'Doe',
        }),
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@test.com', sub: 'u1' }),
        expect.objectContaining({ expiresIn: expect.any(String) }),
      );
      expect(mockPrisma.userRefreshToken.create).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('выбрасывает ConflictException, если email уже занят (не гость)', async () => {
      mockUsersService.completeGuestRegistration.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        isGuest: false,
      });
      await expect(service.register('user@test.com', 'password123', 'John', 'Doe')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register('user@test.com', 'password123', 'John', 'Doe')).rejects.toThrow(
        'Пользователь с таким email уже зарегистрирован',
      );
    });

    it('создаёт пользователя и возвращает login при новом email', async () => {
      mockUsersService.completeGuestRegistration.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      const created = {
        id: 'u-new',
        email: 'new@test.com',
        firstName: 'New',
        lastName: 'User',
        role: 'USER',
      };
      mockUsersService.create.mockResolvedValue(created);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.register('new@test.com', 'password123', 'New', 'User');

      expect(result.access_token).toBe('jwt-token');
      expect(result.user.email).toBe('new@test.com');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
        }),
      );
    });
  });
});
