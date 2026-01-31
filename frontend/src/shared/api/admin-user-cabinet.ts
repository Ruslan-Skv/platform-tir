const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface UserCabinetSettings {
  id: string;
  showProfileSection: boolean;
  showOrdersSection: boolean;
  showNotificationsSection: boolean;
  showNotificationHistory?: boolean;
  showPasswordSection: boolean;
  showQuickLinks: boolean;
  updatedAt: string;
}

export async function getAdminUserCabinetSettings(): Promise<UserCabinetSettings> {
  const res = await fetch(`${API_URL}/admin/user-cabinet/settings`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export interface UserCabinetNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserCabinetData {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: string | number;
    createdAt: string;
    items: Array<{ product?: { name: string } }>;
  }>;
  notificationSettings: { notifyOnSupportChatReply: boolean };
  notifications?: UserCabinetNotification[];
}

export async function getAdminUserCabinetData(userId: string): Promise<UserCabinetData> {
  const res = await fetch(`${API_URL}/admin/user-cabinet/user/${userId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить данные');
  return res.json();
}

export async function updateAdminUserCabinetSettings(data: Partial<UserCabinetSettings>) {
  const res = await fetch(`${API_URL}/admin/user-cabinet/settings`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка сохранения');
  }
  return res.json();
}
