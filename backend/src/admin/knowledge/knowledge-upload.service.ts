import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';

const KNOWLEDGE_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'knowledge');
const KNOWLEDGE_UPLOADS_URL_PREFIX = '/uploads/knowledge/';

@Injectable()
export class KnowledgeUploadService {
  private readonly logger = new Logger(KnowledgeUploadService.name);

  private saveUploadedFile(
    file: Express.Multer.File,
    baseUrl: string,
    prefix: string,
  ): { imageUrl: string } {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'knowledge');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = extname(file.originalname) || '';
    const filename = `${prefix}-${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destPath);
    const rel = `/uploads/knowledge/${filename}`;
    const urlPrefix = uploadsBaseUrl(baseUrl);
    return { imageUrl: `${urlPrefix}${rel}` };
  }

  uploadThumbnail(file: Express.Multer.File, baseUrl: string): { imageUrl: string } {
    return this.saveUploadedFile(file, baseUrl, 'knowledge');
  }

  uploadAttachment(
    file: Express.Multer.File,
    baseUrl: string,
  ): { fileUrl: string; fileName: string; fileSize: number; mimeType: string } {
    const result = this.saveUploadedFile(file, baseUrl, 'attachment');
    return {
      fileUrl: result.imageUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  uploadVideo(file: Express.Multer.File, baseUrl: string): { videoUrl: string } {
    const result = this.saveUploadedFile(file, baseUrl, 'video');
    return { videoUrl: result.imageUrl };
  }

  /**
   * Безопасно маппит URL из БД в локальный путь внутри uploads/knowledge.
   * В БД URL может быть относительным (/uploads/knowledge/...) или абсолютным
   * (https://host/uploads/knowledge/...). Внешние ссылки (YouTube, CDN) и чужие
   * папки возвращают null — их удалять нельзя.
   */
  localFilePathFromUrl(rawUrl: string | null | undefined): string | null {
    const url = rawUrl?.trim();
    if (!url) return null;

    let filename: string | null = null;
    if (url.startsWith(KNOWLEDGE_UPLOADS_URL_PREFIX)) {
      filename = url.slice(KNOWLEDGE_UPLOADS_URL_PREFIX.length);
    } else if (/^https?:\/\//i.test(url)) {
      try {
        const parsed = new URL(url);
        if (!parsed.pathname.startsWith(KNOWLEDGE_UPLOADS_URL_PREFIX)) return null;
        filename = parsed.pathname.slice(KNOWLEDGE_UPLOADS_URL_PREFIX.length);
      } catch {
        return null;
      }
    } else {
      return null;
    }

    filename = filename.split('?')[0].split('#')[0];
    if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return null;
    }

    const filePath = path.resolve(KNOWLEDGE_UPLOADS_DIR, filename);
    if (!filePath.startsWith(KNOWLEDGE_UPLOADS_DIR + path.sep)) return null;
    return filePath;
  }

  /**
   * Удаляет с диска локальные файлы knowledge по URL из БД.
   * Не бросает ошибок: недоступность файла не должна ломать удаление записи.
   * Возвращает число удалённых файлов.
   */
  async removeLocalFilesByUrls(urls: (string | null | undefined)[]): Promise<number> {
    const uniquePaths = new Set<string>();
    for (const url of urls) {
      const filePath = this.localFilePathFromUrl(url);
      if (filePath) uniquePaths.add(filePath);
    }

    let removed = 0;
    for (const filePath of uniquePaths) {
      try {
        await fs.promises.unlink(filePath);
        removed += 1;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue;
        this.logger.warn(
          `Не удалось удалить файл ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return removed;
  }
}
