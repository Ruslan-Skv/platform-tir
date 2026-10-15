import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Настройки авторизации; пока строки нет в БД — дефолты (всё включено) */
  async getSettings() {
    const settings = await this.prisma.authSettings.findUnique({
      where: { id: 'main' },
    });
    if (!settings) {
      return { id: 'main', sberAuthEnabled: true, updatedAt: null };
    }
    return settings;
  }

  /** Публичное подмножество настроек (для страницы входа) */
  async getPublicSettings() {
    const settings = await this.prisma.authSettings.findUnique({
      where: { id: 'main' },
      select: { sberAuthEnabled: true },
    });
    return { sberAuthEnabled: settings?.sberAuthEnabled ?? true };
  }

  /** Проверка перед запуском входа через Сбер ID */
  async assertSberAuthEnabled() {
    const { sberAuthEnabled } = await this.getPublicSettings();
    if (!sberAuthEnabled) {
      throw new ForbiddenException('Вход через Сбер ID отключён администратором');
    }
  }
}
