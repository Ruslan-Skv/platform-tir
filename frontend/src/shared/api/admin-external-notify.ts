import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAdminAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('admin_token') || localStorage.getItem('user_token')
      : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ExternalNotifyChannelsSettings {
  orderNotifyEmails: string[];
  orderNotifyTelegramIds: string[];
  orderNotifyMaxIds: string[];
  knowledgeFeedbackNotifyEmails: string[];
  knowledgeFeedbackNotifyTelegramIds: string[];
  knowledgeFeedbackNotifyMaxIds: string[];
  siteFeedbackNotifyEmails: string[];
  siteFeedbackNotifyTelegramIds: string[];
  siteFeedbackNotifyMaxIds: string[];
  supportNotifyEmails: string[];
  supportNotifyTelegramIds: string[];
  supportNotifyMaxIds: string[];
  reviewNotifyEmails: string[];
  reviewNotifyTelegramIds: string[];
  reviewNotifyMaxIds: string[];
  commentNotifyEmails: string[];
  commentNotifyTelegramIds: string[];
  commentNotifyMaxIds: string[];
  knowledgeTrainingNotifyEmails: string[];
  knowledgeTrainingNotifyTelegramIds: string[];
  knowledgeTrainingNotifyMaxIds: string[];
  workDayNotifyEmails: string[];
  workDayNotifyTelegramIds: string[];
  workDayNotifyMaxIds: string[];
  updatedAt: string;
}

export async function getAdminExternalNotifyChannels(): Promise<ExternalNotifyChannelsSettings> {
  const res = await apiFetch(`${API_URL}/admin/notifications/external-channels`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить каналы уведомлений');
  return res.json();
}

export async function updateAdminExternalNotifyChannels(
  data: Partial<
    Pick<
      ExternalNotifyChannelsSettings,
      | 'orderNotifyEmails'
      | 'orderNotifyTelegramIds'
      | 'orderNotifyMaxIds'
      | 'knowledgeFeedbackNotifyEmails'
      | 'knowledgeFeedbackNotifyTelegramIds'
      | 'knowledgeFeedbackNotifyMaxIds'
      | 'siteFeedbackNotifyEmails'
      | 'siteFeedbackNotifyTelegramIds'
      | 'siteFeedbackNotifyMaxIds'
      | 'supportNotifyEmails'
      | 'supportNotifyTelegramIds'
      | 'supportNotifyMaxIds'
      | 'reviewNotifyEmails'
      | 'reviewNotifyTelegramIds'
      | 'reviewNotifyMaxIds'
      | 'commentNotifyEmails'
      | 'commentNotifyTelegramIds'
      | 'commentNotifyMaxIds'
      | 'knowledgeTrainingNotifyEmails'
      | 'knowledgeTrainingNotifyTelegramIds'
      | 'knowledgeTrainingNotifyMaxIds'
      | 'workDayNotifyEmails'
      | 'workDayNotifyTelegramIds'
      | 'workDayNotifyMaxIds'
    >
  >
): Promise<ExternalNotifyChannelsSettings> {
  const res = await apiFetch(`${API_URL}/admin/notifications/external-channels`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Не удалось сохранить каналы уведомлений');
  }
  return res.json();
}
