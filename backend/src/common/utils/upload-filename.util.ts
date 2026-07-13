/**
 * Multer/busboy передаёт originalname как latin1; кириллица в UTF-8 ломается (ÐÑÐ°Ð¹Ñ…).
 * Перекодируем обратно в UTF-8, если в имени появилась кириллица.
 */
export function decodeMultipartFilename(filename: string): string {
  if (!filename) return filename;

  const decoded = Buffer.from(filename, 'latin1').toString('utf8');
  if (decoded === filename) return filename;

  const hasCyrillic = /[\u0400-\u04FF]/.test(decoded);
  const lookedBroken = /[ÃÐÑÂ]/.test(filename);

  if (hasCyrillic || lookedBroken) {
    return decoded;
  }

  return filename;
}
