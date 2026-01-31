const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type NotificationSoundType = 'beep' | 'ding' | 'chime' | 'bell' | 'custom';

export interface AdminNotificationsSettings {
  id: string;
  role: string | null;
  soundEnabled: boolean;
  soundVolume: number;
  soundType: NotificationSoundType;
  customSoundUrl: string | null;
  desktopNotifications: boolean;
  checkIntervalSeconds: number;
  notifyOnReviews: boolean;
  notifyOnOrders: boolean;
  notifyOnSupportChat: boolean;
  notifyOnMeasurementForm: boolean;
  notifyOnCallbackForm: boolean;
}

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getAdminNotificationsSettings(): Promise<AdminNotificationsSettings> {
  const res = await fetch(`${API_URL}/admin/notifications/settings`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function getAdminNotificationsSettingsByRole(
  role: string | null
): Promise<AdminNotificationsSettings> {
  const params = new URLSearchParams();
  params.set('role', role === null ? 'default' : role);
  const res = await fetch(`${API_URL}/admin/notifications/settings/by-role?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function getAllAdminNotificationsSettings(): Promise<AdminNotificationsSettings[]> {
  const res = await fetch(`${API_URL}/admin/notifications/settings/all`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminNotificationsSettings(
  data: Partial<AdminNotificationsSettings>
): Promise<AdminNotificationsSettings> {
  const body = {
    role: data.role,
    soundEnabled: data.soundEnabled,
    soundVolume: data.soundVolume,
    soundType: data.soundType,
    customSoundUrl: data.customSoundUrl,
    desktopNotifications: data.desktopNotifications,
    checkIntervalSeconds: data.checkIntervalSeconds,
    notifyOnReviews: data.notifyOnReviews,
    notifyOnOrders: data.notifyOnOrders,
    notifyOnSupportChat: data.notifyOnSupportChat,
    notifyOnMeasurementForm: data.notifyOnMeasurementForm,
    notifyOnCallbackForm: data.notifyOnCallbackForm,
  };
  const res = await fetch(`${API_URL}/admin/notifications/settings`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err?.message ||
      (Array.isArray(err?.message) ? err.message.join(', ') : null) ||
      'Не удалось сохранить настройки';
    throw new Error(message);
  }
  return res.json();
}

export interface NotificationSound {
  id: string;
  name: string;
  fileUrl: string;
  createdAt: string;
}

export async function getAdminNotificationSounds(): Promise<NotificationSound[]> {
  const res = await fetch(`${API_URL}/admin/notifications/sounds`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить звуки');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function uploadAdminNotificationSound(
  file: File,
  name?: string
): Promise<NotificationSound> {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('admin_token') || localStorage.getItem('user_token')
      : null;

  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/admin/notifications/sounds`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err?.message ||
      (Array.isArray(err?.message) ? err.message.join(', ') : null) ||
      'Не удалось загрузить звук';
    throw new Error(message);
  }
  return res.json();
}

export async function deleteAdminNotificationSound(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/notifications/sounds/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить звук');
}
