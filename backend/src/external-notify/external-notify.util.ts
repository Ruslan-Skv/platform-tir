import type { Prisma } from '@prisma/client';

export function parseStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function normalizeStringArray(values: string[] | null | undefined): string[] {
  if (!values) return [];
  return values.map((v) => v.trim()).filter(Boolean);
}

export function hasAnyChannel(channels: {
  emails?: string[];
  telegramIds?: string[];
  maxIds?: string[];
}): boolean {
  return (
    (channels.emails?.length ?? 0) > 0 ||
    (channels.telegramIds?.length ?? 0) > 0 ||
    (channels.maxIds?.length ?? 0) > 0
  );
}
