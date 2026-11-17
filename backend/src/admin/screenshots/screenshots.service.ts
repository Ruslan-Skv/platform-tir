import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../database/prisma.service';
import {
  ADMIN_SCREENSHOT_SELECT,
  SCREENSHOTS_CLEANUP_INTERVAL_MS_DEFAULT,
  SCREENSHOTS_UPLOAD_DIR,
  SCREENSHOT_TTL_MS,
} from './screenshots.constants';

type RequestUser = { id: string; role: string };

type ScreenshotRow = {
  id: string;
  fileName: string;
  mimeType: string;
  authorId: string;
};

/**
 * Скриншоты админки: захват кнопкой 📷 в шапке, хранение 3 суток.
 * Файлы лежат в uploads/screenshots и отдаются только автору или суперадмину.
 */
@Injectable()
export class AdminScreenshotsService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.cleanupExpired();
    this.cleanupTimer = setInterval(
      () => void this.cleanupExpired(),
      this.resolveCleanupIntervalMs(),
    );
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Список скриншотов: суперадмин видит все (опц. фильтр по автору),
   * остальные — только свои. Просроченные не показываются до удаления свипером.
   */
  list(user: RequestUser, opts: { authorId?: string; limit?: number } = {}) {
    const where: { expiresAt: { gt: Date }; authorId?: string } = {
      expiresAt: { gt: new Date() },
    };
    if (user.role === 'SUPER_ADMIN') {
      if (opts.authorId) where.authorId = opts.authorId;
    } else {
      where.authorId = user.id;
    }
    return this.prisma.adminScreenshot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(opts.limit ?? 100, 200),
      select: ADMIN_SCREENSHOT_SELECT,
    });
  }

  /** Создаёт запись о загруженном файле (файл уже сохранён multer-ом). */
  async create(
    userId: string,
    file: Express.Multer.File,
    dto: { comment?: string; pageUrl?: string; width?: number; height?: number },
  ) {
    const createdAt = new Date();
    try {
      return await this.prisma.adminScreenshot.create({
        data: {
          fileName: path.basename(file.filename),
          fileUrl: `/uploads/screenshots/${file.filename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          width: dto.width ?? null,
          height: dto.height ?? null,
          comment: dto.comment?.trim() || null,
          pageUrl: dto.pageUrl?.trim() || null,
          authorId: userId,
          createdAt,
          expiresAt: new Date(createdAt.getTime() + SCREENSHOT_TTL_MS),
        },
        select: ADMIN_SCREENSHOT_SELECT,
      });
    } catch (error) {
      // Не оставляем файл-сироту, если запись не создалась
      await this.unlinkQuietly(file.filename);
      throw error;
    }
  }

  /** Открывает файл скриншота для выдачи (просмотр/скачивание) — автору или суперадмину. */
  async openFile(
    user: RequestUser,
    id: string,
  ): Promise<{ stream: ReturnType<typeof createReadStream>; mimeType: string; fileName: string }> {
    const shot = await this.getExistingRow(id);
    this.assertCanAccess(user, shot);

    const absolutePath = this.resolveAbsolutePath(shot.fileName);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Файл скриншота не найден');
    }
    return {
      stream: createReadStream(absolutePath),
      mimeType: shot.mimeType,
      fileName: shot.fileName,
    };
  }

  /** Удаляет скриншот (запись + файл): автор может удалить свой, суперадмин — любой. */
  async remove(user: RequestUser, id: string) {
    const shot = await this.getExistingRow(id);
    this.assertCanAccess(user, shot);

    await this.prisma.adminScreenshot.delete({ where: { id: shot.id } });
    await this.unlinkQuietly(shot.fileName);
    return { success: true };
  }

  /** Безвозвратно удаляет просроченные скриншоты (записи + файлы). */
  async cleanupExpired(): Promise<number> {
    const expired = await this.prisma.adminScreenshot.findMany({
      where: { expiresAt: { lte: new Date() } },
      select: { id: true, fileName: true },
    });
    if (expired.length === 0) return 0;

    await this.prisma.adminScreenshot.deleteMany({
      where: { id: { in: expired.map((row) => row.id) } },
    });
    await Promise.all(expired.map((row) => this.unlinkQuietly(row.fileName)));
    return expired.length;
  }

  private async getExistingRow(id: string): Promise<ScreenshotRow> {
    const shot = await this.prisma.adminScreenshot.findUnique({
      where: { id },
      select: { id: true, fileName: true, mimeType: true, authorId: true },
    });
    if (!shot) {
      throw new NotFoundException('Скриншот не найден');
    }
    return shot;
  }

  private assertCanAccess(user: RequestUser, shot: ScreenshotRow): void {
    if (user.role !== 'SUPER_ADMIN' && shot.authorId !== user.id) {
      throw new ForbiddenException('Скриншот доступен только автору и супер-администратору');
    }
  }

  /** Абсолютный путь к файлу с защитой от выхода за каталог (fileName хранится без каталогов). */
  private resolveAbsolutePath(fileName: string): string {
    const safeName = path.basename(fileName);
    return path.join(SCREENSHOTS_UPLOAD_DIR, safeName);
  }

  private async unlinkQuietly(fileName: string): Promise<void> {
    try {
      await fs.promises.unlink(this.resolveAbsolutePath(fileName));
    } catch {
      // файла уже нет — это не ошибка
    }
  }

  private resolveCleanupIntervalMs(): number {
    const raw = Number(process.env.SCREENSHOTS_CLEANUP_INTERVAL_MS);
    if (Number.isFinite(raw) && raw >= 1000) return raw;
    return SCREENSHOTS_CLEANUP_INTERVAL_MS_DEFAULT;
  }
}
