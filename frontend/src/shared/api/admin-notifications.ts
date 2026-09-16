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
  notifyOnWaybills: boolean;
  notifyOnInstallationSchedules: boolean;
  notifyOnRepairSchedules: boolean;
  notifyOnFurnitureSchedules: boolean;
  notifyOnMeasurements: boolean;
  notifyOnContractSigning: boolean;
  /** События, разрешённые для роли супер-админом; false — событие роли недоступно. */
  allowedEvents?: Partial<Record<MyNotifyEventKey, boolean>>;
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

const MY_NOTIFY_EVENT_KEYS = [
  'notifyOnReviews',
  'notifyOnOrders',
  'notifyOnSupportChat',
  'notifyOnMeasurementForm',
  'notifyOnCallbackForm',
  'notifyOnDirectorForm',
  'notifyOnQuoteForm',
  'notifyOnQuizMebel',
  'notifyOnQuizRemont',
  'notifyOnKnowledgeFeedback',
  'notifyOnSiteFeedback',
  'notifyOnKnowledgeTraining',
  'notifyOnWorkDays',
  'notifyOnWaybills',
  'notifyOnInstallationSchedules',
  'notifyOnRepairSchedules',
  'notifyOnFurnitureSchedules',
  'notifyOnMeasurements',
  'notifyOnContractSigning',
] as const;

export type MyNotifyEventKey = (typeof MY_NOTIFY_EVENT_KEYS)[number];

export type MyAdminNotificationDeliveryPrefs = {
  soundEnabled?: boolean;
  soundVolume?: number;
  soundType?: NotificationSoundType;
  customSoundUrl?: string | null;
  desktopNotifications?: boolean;
  checkIntervalSeconds?: number;
} & Partial<Record<MyNotifyEventKey, boolean>>;

/** Личные настройки: доставка + опциональные личные переопределения событий. */
export async function updateMyAdminNotificationDeliveryPrefs(
  data: MyAdminNotificationDeliveryPrefs
): Promise<AdminNotificationsSettings> {
  const body: Record<string, unknown> = {
    soundEnabled: data.soundEnabled,
    soundVolume: data.soundVolume,
    soundType: data.soundType,
    customSoundUrl: data.customSoundUrl,
    desktopNotifications: data.desktopNotifications,
    checkIntervalSeconds: data.checkIntervalSeconds,
  };
  for (const key of MY_NOTIFY_EVENT_KEYS) {
    if (data[key] !== undefined) body[key] = data[key];
  }
  const res = await apiFetch(`${API_URL}/admin/notifications/settings/me`, {
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

export async function resetMyAdminNotificationSettings(): Promise<AdminNotificationsSettings> {
  const res = await apiFetch(`${API_URL}/admin/notifications/settings/me`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось сбросить настройки');
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
    notifyOnWaybills: data.notifyOnWaybills,
    notifyOnInstallationSchedules: data.notifyOnInstallationSchedules,
    notifyOnRepairSchedules: data.notifyOnRepairSchedules,
    notifyOnFurnitureSchedules: data.notifyOnFurnitureSchedules,
    notifyOnMeasurements: data.notifyOnMeasurements,
    notifyOnContractSigning: data.notifyOnContractSigning,
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
    notifyOnWaybills: data.notifyOnWaybills,
    notifyOnInstallationSchedules: data.notifyOnInstallationSchedules,
    notifyOnRepairSchedules: data.notifyOnRepairSchedules,
    notifyOnFurnitureSchedules: data.notifyOnFurnitureSchedules,
    notifyOnMeasurements: data.notifyOnMeasurements,
    notifyOnContractSigning: data.notifyOnContractSigning,
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

export type AdminBellNotificationHistoryItem = {
  key: string;
  type: string;
  text: string;
  link: string | null;
  occurredAt: string;
  readAt: string;
};

export async function getAdminBellNotificationHistory(
  limit = 50
): Promise<AdminBellNotificationHistoryItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/history?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить историю уведомлений');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function saveAdminBellNotificationHistory(
  items: { key: string; type: string; text: string; link?: string; occurredAt?: string }[]
): Promise<void> {
  const unique = [
    ...new Map(
      items.filter((item) => item.key && item.text).map((item) => [item.key, item])
    ).values(),
  ];
  for (let i = 0; i < unique.length; i += BELL_DISMISS_BATCH_SIZE) {
    const chunk = unique.slice(i, i + BELL_DISMISS_BATCH_SIZE);
    const res = await apiFetch(`${API_URL}/admin/notifications/bell/history`, {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify({ items: chunk }),
    });
    if (!res.ok) throw new Error('Не удалось сохранить историю уведомлений');
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

export type AdminBellWaybillNotification = {
  id: string;
  kind: 'created' | 'updated' | 'completed' | 'failed';
  kindLabel: string;
  waybillTaskId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

export async function getAdminBellWaybillNotifications(
  limit = 20
): Promise<AdminBellWaybillNotification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/waybills?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить уведомления по путевым листам');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export type AdminBellInstallationScheduleNotification = {
  id: string;
  kind: 'created' | 'updated' | 'completed' | 'failed';
  kindLabel: string;
  installationScheduleId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

export async function getAdminBellInstallationScheduleNotifications(
  limit = 20
): Promise<AdminBellInstallationScheduleNotification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(
    `${API_URL}/admin/notifications/bell/installation-schedules?${params}`,
    {
      headers: getAdminAuthHeaders(),
    }
  );
  if (!res.ok) throw new Error('Не удалось загрузить уведомления по графику монтажей');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export type AdminBellRepairScheduleNotification = {
  id: string;
  kind: 'created' | 'updated' | 'status_changed' | 'entry_added';
  kindLabel: string;
  repairScheduleProjectId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

export async function getAdminBellRepairScheduleNotifications(
  limit = 20
): Promise<AdminBellRepairScheduleNotification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/repair-schedules?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить уведомления по графику ремонтов');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export type AdminBellMeasurementNotification = {
  id: string;
  kind: 'created' | 'completed' | 'cancelled' | 'converted';
  kindLabel: string;
  measurementId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

export async function getAdminBellMeasurementNotifications(
  limit = 20
): Promise<AdminBellMeasurementNotification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/measurements?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить уведомления по замерам');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export type AdminBellFurnitureScheduleNotification = {
  id: string;
  kind: 'created' | 'updated' | 'status_changed' | 'entry_added';
  kindLabel: string;
  furnitureScheduleProjectId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

export async function getAdminBellFurnitureScheduleNotifications(
  limit = 20
): Promise<AdminBellFurnitureScheduleNotification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/furniture-schedules?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить уведомления по графику мебели');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export type AdminBellCalendarNotification = {
  id: string;
  kind: 'created';
  kindLabel: string;
  calendarEventId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

export async function getAdminBellCalendarNotifications(
  limit = 20
): Promise<AdminBellCalendarNotification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/calendar?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить уведомления календаря');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export type AdminBellMessengerNotification = {
  id: string;
  kind: 'message';
  kindLabel: string;
  messageId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

export async function getAdminBellMessengerNotifications(
  limit = 20
): Promise<AdminBellMessengerNotification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/messenger?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить уведомления мессенджера');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export type AdminBellKanbanNotification = {
  id: string;
  kind: 'assigned' | 'moved' | 'commented' | 'due_changed' | 'priority';
  kindLabel: string;
  cardId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

export type AdminBellContractSigningNotification = {
  id: string;
  kind: 'signed' | 'rejected' | 'viewed';
  kindLabel: string;
  packageId: string;
  sessionId: string;
  title: string;
  message: string;
  href: string;
  occurredAt: string;
};

export async function getAdminBellContractSigningNotifications(
  limit = 20
): Promise<AdminBellContractSigningNotification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/contract-signing?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить уведомления о подписании договоров');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getAdminBellKanbanNotifications(
  limit = 20
): Promise<AdminBellKanbanNotification[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`${API_URL}/admin/notifications/bell/kanban?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить уведомления канбана');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
