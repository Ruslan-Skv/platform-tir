import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { PasswordResetMailService } from './password-reset-mail.service';
import { parseDurationToMs } from './auth-duration.util';
import {
  generateOpaqueRefreshToken,
  hashOpaqueToken,
  hashPassword,
  verifyPassword,
} from './password-crypto';

type UserWithoutPassword = Omit<User, 'password'>;
type UserPayload = {
  id: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  avatar?: string | null;
};

export type AuthTokensResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    jobTitle: string | null;
    role: string;
    avatar: string | null;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private config: ConfigService,
    private passwordResetMail: PasswordResetMailService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserWithoutPassword | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    if ((user as { isGuest?: boolean }).isGuest) return null;
    if (!(await verifyPassword(password, user.password))) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = user;
    return result;
  }

  private getAccessExpiresIn(): string {
    return (
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ||
      this.config.get<string>('JWT_EXPIRES_IN') ||
      '15m'
    );
  }

  private getRefreshExpiresMs(): number {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';
    return parseDurationToMs(raw, 30 * 86_400_000);
  }

  private async persistNewRefresh(userId: string): Promise<string> {
    const raw = generateOpaqueRefreshToken();
    const expiresAt = new Date(Date.now() + this.getRefreshExpiresMs());
    await this.prisma.userRefreshToken.create({
      data: {
        userId,
        tokenHash: hashOpaqueToken(raw),
        expiresAt,
      },
    });
    return raw;
  }

  private buildUserBlock(user: UserPayload): AuthTokensResponse['user'] {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      jobTitle: user.jobTitle ?? null,
      role: user.role,
      avatar: user.avatar ?? null,
    };
  }

  async login(user: UserPayload): Promise<AuthTokensResponse> {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.getAccessExpiresIn(),
    });
    const refresh_token = await this.persistNewRefresh(user.id);
    return {
      access_token,
      refresh_token,
      user: this.buildUserBlock(user),
    };
  }

  async refreshTokens(refreshTokenRaw: string): Promise<AuthTokensResponse> {
    const tokenHash = hashOpaqueToken(refreshTokenRaw);
    const row = await this.prisma.userRefreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row || row.revokedAt || new Date() > row.expiresAt) {
      throw new UnauthorizedException('Сессия недействительна или истекла. Войдите снова.');
    }
    const u = row.user;
    if (!u.isActive || (u as { isGuest?: boolean }).isGuest) {
      throw new UnauthorizedException('Сессия недействительна. Войдите снова.');
    }

    await this.prisma.userRefreshToken.delete({ where: { id: row.id } });

    const payload = { email: u.email, sub: u.id, role: u.role };
    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.getAccessExpiresIn(),
    });
    const refresh_token = await this.persistNewRefresh(u.id);
    const loginUser: UserPayload = {
      id: u.id,
      email: u.email,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      jobTitle: u.jobTitle ?? null,
      avatar: u.avatar ?? null,
    };
    return {
      access_token,
      refresh_token,
      user: this.buildUserBlock(loginUser),
    };
  }

  /** Отзыв одной сессии по refresh (выход). Идемпотентно. */
  async revokeRefreshToken(refreshTokenRaw: string): Promise<void> {
    const tokenHash = hashOpaqueToken(refreshTokenRaw);
    await this.prisma.userRefreshToken.deleteMany({ where: { tokenHash } });
  }

  /** Все устройства (смена пароля, сброс). */
  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.userRefreshToken.deleteMany({ where: { userId } });
  }

  async register(email: string, password: string, firstName?: string, lastName?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const completed = await this.usersService.completeGuestRegistration(
      normalizedEmail,
      password,
      firstName,
      lastName,
    );
    if (completed) {
      return this.login({
        id: completed.id,
        email: completed.email,
        role: completed.role,
        firstName: completed.firstName,
        lastName: completed.lastName,
        avatar: completed.avatar ?? null,
      });
    }
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing && !(existing as { isGuest?: boolean }).isGuest) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }
    const user = await this.usersService.create({
      email: normalizedEmail,
      password,
      firstName,
      lastName,
    });
    return this.login({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: null,
    });
  }

  /** Запрос восстановления пароля. Отправляет письмо, если пользователь найден. Всегда возвращает успех (безопасность). */
  async requestPasswordReset(email: string): Promise<{ ok: boolean }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) return { ok: true };
    if ((user as { isGuest?: boolean }).isGuest) return { ok: true };

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const siteUrl = this.config.get<string>('SITE_URL', 'http://localhost:3000');
    const resetUrl = `${siteUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    const sent = await this.passwordResetMail.sendPasswordResetEmail(normalizedEmail, resetUrl);
    if (!sent) {
      console.warn(
        'AuthService.requestPasswordReset: письмо не отправлено (проверьте SMTP и логи выше)',
      );
    }
    return { ok: true };
  }

  /** Сброс пароля по токену из письма. */
  async resetPassword(token: string, newPassword: string): Promise<{ ok: boolean }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) {
      throw new BadRequestException('Недействительная или просроченная ссылка');
    }
    if (record.usedAt) {
      throw new BadRequestException('Ссылка уже была использована. Запросите новую.');
    }
    if (new Date() > record.expiresAt) {
      throw new BadRequestException('Ссылка истекла. Запросите восстановление пароля заново.');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.revokeAllRefreshTokensForUser(record.userId);

    return { ok: true };
  }
}
