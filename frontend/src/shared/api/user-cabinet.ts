const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface UserCabinetSettings {
  id?: string;
  showProfileSection: boolean;
  showOrdersSection: boolean;
  showNotificationsSection: boolean;
  showNotificationHistory?: boolean;
  showPasswordSection: boolean;
  showQuickLinks: boolean;
  updatedAt?: string;
}

export async function getUserCabinetSettings(): Promise<UserCabinetSettings> {
  const res = await fetch(`${API_URL}/user-cabinet/settings`);
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}
