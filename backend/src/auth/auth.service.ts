import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { PasswordResetMailService } from './password-reset-mail.service';
import { User } from '@prisma/client';

type UserWithoutPassword = Omit<User, 'password'>;
type UserPayload = {
  id: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
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
    if ((user as { isGuest?: boolean }).isGuest) return null; // Гость не может войти
    if (!(await bcrypt.compare(password, user.password))) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = user;
    return result;
  }

  async login(user: UserPayload) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: (user as UserWithoutPassword).avatar ?? null,
      },
    };
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
      return this.login(completed);
    }
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing && !(existing as { isGuest?: boolean }).isGuest) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
    });
    return this.login(user);
  }

  /** Запрос восстановления пароля. Отправляет письмо, если пользователь найден. Всегда возвращает успех (безопасность). */
  async requestPasswordReset(email: string): Promise<{ ok: boolean }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) return { ok: true };
    if ((user as { isGuest?: boolean }).isGuest) return { ok: true }; // Гость — не отправляем

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

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

    return { ok: true };
  }
}
