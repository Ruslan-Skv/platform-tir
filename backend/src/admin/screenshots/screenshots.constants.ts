import * as path from 'path';

/** Каталог загрузки скриншотов (раздаётся только через авторизованный API). */
export const SCREENSHOTS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'screenshots');

/** Время жизни скриншота — 3 суток, затем свипер удаляет безвозвратно. */
export const SCREENSHOT_TTL_MS = 3 * 24 * 60 * 60 * 1000;

/** Период запуска свипера просроченных скриншотов (переопределяется для тестов env-ом). */
export const SCREENSHOTS_CLEANUP_INTERVAL_MS_DEFAULT = 30 * 60 * 1000;

/** Максимальный размер файла скриншота. */
export const SCREENSHOT_MAX_FILE_SIZE = 15 * 1024 * 1024;

/** Допустимые типы файлов и соответствующие расширения. */
export const SCREENSHOT_ALLOWED_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

/** Поля скриншота, возвращаемые в API (с данными автора). */
export const ADMIN_SCREENSHOT_SELECT = {
  id: true,
  fileName: true,
  fileUrl: true,
  fileSize: true,
  mimeType: true,
  width: true,
  height: true,
  comment: true,
  pageUrl: true,
  createdAt: true,
  expiresAt: true,
  authorId: true,
  author: {
    select: { id: true, email: true, firstName: true, lastName: true, role: true, jobTitle: true },
  },
} as const;
