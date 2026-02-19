/**
 * Формирует полный URL аватарки для отображения.
 * Аватар хранится как путь вида /uploads/avatars/avatar-xxx.jpg.
 * Если путь относительный (без ведущего /), он будет скорректирован.
 */
export function getAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar || typeof avatar !== 'string') return null;
  const trimmed = avatar.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const base = apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

export function getInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string
): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}
