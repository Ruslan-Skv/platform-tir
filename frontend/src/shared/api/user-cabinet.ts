import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface UserCabinetSettings {
  id?: string;
  showProfileSection: boolean;
  showOrdersSection: boolean;
  showNotificationsSection: boolean;
  showNotificationHistory?: boolean;
  showPasswordSection: boolean;
  showQuickLinks: boolean;
  privacyPolicyUrl?: string | null;
  privacyPolicyTitle?: string | null;
  privacyPolicyContent?: string | null;
  consentText?: string | null;
  consentLinkText?: string | null;
  updatedAt?: string;
}

export async function getUserCabinetSettings(): Promise<UserCabinetSettings> {
  const res = await apiFetch(`${API_URL}/user-cabinet/settings`);
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}
