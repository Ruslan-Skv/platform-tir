import { HttpException, HttpStatus } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

function isPrivateOrReservedIp(ip: string): boolean {
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
  if (ip.startsWith('127.') || ip === '127.0.0.1') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  if (ip.startsWith('0.')) return true;

  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }

  const lower = ip.toLowerCase();
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('fe80:')) return true;

  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === 'metadata.google.internal') return true;
  if (h.endsWith('.internal')) return true;
  return false;
}

/** Проверяет URL перед server-side fetch (защита от SSRF). */
export async function assertSafeFetchUrl(url: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new HttpException('Некорректная ссылка', HttpStatus.BAD_REQUEST);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpException('Некорректная ссылка', HttpStatus.BAD_REQUEST);
  }

  if (parsed.username || parsed.password) {
    throw new HttpException('Некорректная ссылка', HttpStatus.BAD_REQUEST);
  }

  const hostname = parsed.hostname;
  if (isBlockedHostname(hostname)) {
    throw new HttpException('Запрещённый адрес', HttpStatus.BAD_REQUEST);
  }

  if (isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new HttpException('Запрещённый адрес', HttpStatus.BAD_REQUEST);
    }
    return parsed;
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (!records.length) {
    throw new HttpException('Не удалось разрешить адрес', HttpStatus.BAD_REQUEST);
  }

  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new HttpException('Запрещённый адрес', HttpStatus.BAD_REQUEST);
    }
  }

  return parsed;
}
