import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * bcrypt сам генерирует случайную соль на каждый вызов hash() и кладёт её в строку ($2b$...).
 * cost — число раундов 2^cost (рекомендации OWASP: не ниже 10; 12 — разумный баланс скорость/стойкость).
 */
export const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

/** Opaque refresh: в БД только хеш, как для reset-токенов (высокая энтропия у raw). */
export function hashOpaqueToken(raw: string): string {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function generateOpaqueRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}
