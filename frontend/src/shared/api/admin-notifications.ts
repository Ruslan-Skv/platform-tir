import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type NotificationSoundType = 'beep' | 'ding' | 'chime' | 'bell' | 'custom';

export interface AdminNotificationsSettings {
  id: string;
  role: string | null;
  userId?: string;
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
  notifyOnDirectorForm: boolean;
  notifyOnQuoteForm: boolean;
  notifyOnQuizMebel: boolean;
  notifyOnQuizRemont: boolean;
  notifyOnKnowledgeFeedback: boolean;
  notifyOnSiteFeedback: boolean;
  notifyOnKnowledgeTraining: boolean;
  notifyOnWorkDays: boolean;
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
  const res = await apiFetch(`${API_URL}/admin/notifications/settings`, {
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
  const res = await apiFetch(`${API_URL}/admin/notifications/settings/by-role?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export interface AdminNotificationUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

export interface CustomerNotificationSettings {
  id: string | null;
  userId: string;
  notifyOnSupportChatReply: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function getAdminNotificationCustomers(): Promise<AdminNotificationUser[]> {
  const res = await apiFetch(`${API_URL}/admin/notifications/customers`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getAdminCustomerNotificationSettings(
  userId: string
): Promise<CustomerNotificationSettings> {
  const res = await apiFetch(`${API_URL}/admin/notifications/customers/${userId}/settings`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminCustomerNotificationSettings(
  userId: string,
  data: { notifyOnSupportChatReply?: boolean }
): Promise<CustomerNotificationSettings> {
  const res = await apiFetch(`${API_URL}/admin/notifications/customers/${userId}/settings`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
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

export async function updateAllAdminCustomerNotificationSettings(data: {
  notifyOnSupportChatReply?: boolean;
}): Promise<{ updated: number }> {
  const res = await apiFetch(`${API_URL}/admin/notifications/customers/bulk`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
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

export async function getAdminNotificationUsers(): Promise<AdminNotificationUser[]> {
  const res = await apiFetch(`${API_URL}/admin/notifications/users`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getAdminNotificationsSettingsByUser(
  userId: string
): Promise<AdminNotificationsSettings> {
  const res = await apiFetch(`${API_URL}/admin/notifications/settings/by-user/${userId}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminNotificationsSettingsByUser(
  userId: string,
  data: Omit<Partial<AdminNotificationsSettings>, 'role' | 'userId'>
): Promise<AdminNotificationsSettings> {
  const body = {
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
    notifyOnDirectorForm: data.notifyOnDirectorForm,
    notifyOnQuoteForm: data.notifyOnQuoteForm,
    notifyOnQuizMebel: data.notifyOnQuizMebel,
    notifyOnQuizRemont: data.notifyOnQuizRemont,
    notifyOnKnowledgeFeedback: data.notifyOnKnowledgeFeedback,
    notifyOnSiteFeedback: data.notifyOnSiteFeedback,
    notifyOnKnowledgeTraining: data.notifyOnKnowledgeTraining,
    notifyOnWorkDays: data.notifyOnWorkDays,
  };
  const res = await apiFetch(`${API_URL}/admin/notifications/settings/by-user/${userId}`, {
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

export async function getAllAdminNotificationsSettings(): Promise<AdminNotificationsSettings[]> {
  const res = await apiFetch(`${API_URL}/admin/notifications/settings/all`, {
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
    notifyOnDirectorForm: data.notifyOnDirectorForm,
    notifyOnQuoteForm: data.notifyOnQuoteForm,
    notifyOnQuizMebel: data.notifyOnQuizMebel,
    notifyOnQuizRemont: data.notifyOnQuizRemont,
    notifyOnKnowledgeFeedback: data.notifyOnKnowledgeFeedback,
    notifyOnSiteFeedback: data.notifyOnSiteFeedback,
    notifyOnKnowledgeTraining: data.notifyOnKnowledgeTraining,
    notifyOnWorkDays: data.notifyOnWorkDays,
  };
  const res = await apiFetch(`${API_URL}/admin/notifications/settings`, {
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
  const res = await apiFetch(`${API_URL}/admin/notifications/sounds`, {
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

  const res = await apiFetch(`${API_URL}/admin/notifications/sounds`, {
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
  const res = await apiFetch(`${API_URL}/admin/notifications/sounds/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить звук');
}

const BELL_DISMISS_BATCH_SIZE = 200;

export async function getAdminBellDismissedKeys(): Promise<string[]> {
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/dismissed`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить прочитанные уведомления');
  const data = (await res.json()) as { keys?: string[] };
  return Array.isArray(data.keys) ? data.keys : [];
}

export async function dismissAdminBellNotifications(keys: string[]): Promise<void> {
  const unique = [...new Set(keys.filter(Boolean))];
  for (let i = 0; i < unique.length; i += BELL_DISMISS_BATCH_SIZE) {
    const chunk = unique.slice(i, i + BELL_DISMISS_BATCH_SIZE);
    const res = await apiFetch(`${API_URL}/admin/notifications/bell/dismissed`, {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify({ keys: chunk }),
    });
    if (!res.ok) throw new Error('Не удалось сохранить прочитанные уведомления');
  }
}

export type AdminBellTrainingNotification = {
  id: string;
  kind: 'video_completed' | 'study_completed' | 'quiz_passed';
  kindLabel: string;
  materialId: string;
  materialTitle: string;
  userId: string;
  userName: string;
  scorePercent: number | null;
  occurredAt: string;
};

export async function getAdminBellTrainingNotifications(
  limit = 20
): Promise<AdminBellTrainingNotification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/training?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить уведомления об обучении');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export type AdminBellWorkDayNotification = {
  id: string;
  kind:
    | 'late'
    | 'early_leave'
    | 'auto_closed'
    | 'reported_close'
    | 'day_off_request'
    | 'early_leave_request'
    | 'late_arrival_request';
  kindLabel: string;
  workDayId: string | null;
  requestId?: string | null;
  userId: string;
  userName: string;
  workDate: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  occurredAt: string;
};

export async function getAdminBellWorkDayNotifications(
  limit = 20
): Promise<AdminBellWorkDayNotification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/work-days?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить уведомления по учёту рабочего времени');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
