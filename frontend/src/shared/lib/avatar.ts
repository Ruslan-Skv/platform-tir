import { publicUploadUrl } from '@/shared/lib/public-upload-url';

/**
 * Формирует URL аватарки для отображения.
 * Аватар хранится как путь вида /uploads/avatars/avatar-xxx.jpg.
 */
export function getAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar || typeof avatar !== 'string') return null;
  const trimmed = avatar.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return trimmed;
  const resolved = publicUploadUrl(trimmed);
  return resolved || null;
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
