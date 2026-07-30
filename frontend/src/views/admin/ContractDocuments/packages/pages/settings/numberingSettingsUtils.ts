import type { CrmUser } from '@/shared/api/admin-crm';

export const NUMBERING_USERS_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function getNumberingAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

export function formatNumberingUserLabel(
  u: Pick<CrmUser, 'firstName' | 'lastName' | 'email'>
): string {
  const name = [u.lastName, u.firstName].filter(Boolean).join(' ').trim();
  return name || u.email;
}
