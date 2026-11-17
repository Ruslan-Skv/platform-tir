/**
 * Скриншоты админки: список/загрузка/скачивание/удаление.
 * Файлы отдаются только автору и суперадмину — через авторизованные эндпоинты (не /uploads).
 */
import { apiFetch } from '@/shared/lib/api-fetch';
import {
  ensureFreshAccessToken,
  getApiBaseUrl,
  getStoredAccessToken,
} from '@/shared/lib/auth-session';

export interface AdminScreenshotAuthor {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  jobTitle: string | null;
}

export interface AdminScreenshotItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  comment: string | null;
  pageUrl: string | null;
  createdAt: string;
  expiresAt: string;
  authorId: string;
  author: AdminScreenshotAuthor;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  await ensureFreshAccessToken(0);
  const token = getStoredAccessToken();
  if (!token) throw new Error('Нет авторизации');
  const res = await apiFetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      /* не JSON — показываем как есть */
    }
    throw new Error(String(message || `Запрос скриншотов не удался (${res.status})`));
  }
  return res;
}

/** Список скриншотов (суперадмин видит все, остальные — только свои). */
export function listAdminScreenshots(params?: {
  authorId?: string;
  limit?: number;
}): Promise<AdminScreenshotItem[]> {
  const query = new URLSearchParams();
  if (params?.authorId) query.set('authorId', params.authorId);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return authedFetch(`/admin/screenshots${qs ? `?${qs}` : ''}`).then((res) => res.json());
}

/** Загружает снятый скриншот (multipart; Content-Type выставит браузер с boundary). */
export async function uploadAdminScreenshot(input: {
  file: Blob;
  comment?: string;
  pageUrl?: string;
  width?: number;
  height?: number;
}): Promise<AdminScreenshotItem> {
  await ensureFreshAccessToken(0);
  const token = getStoredAccessToken();
  if (!token) throw new Error('Нет авторизации');

  const formData = new FormData();
  formData.append(
    'file',
    input.file,
    input.file instanceof File ? input.file.name : `screenshot-${Date.now()}.png`
  );
  if (input.comment?.trim()) formData.append('comment', input.comment.trim());
  if (input.pageUrl) formData.append('pageUrl', input.pageUrl);
  if (input.width) formData.append('width', String(Math.round(input.width)));
  if (input.height) formData.append('height', String(Math.round(input.height)));

  const res = await apiFetch(`${getApiBaseUrl()}/admin/screenshots`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      /* не JSON — показываем как есть */
    }
    throw new Error(String(message || 'Не удалось сохранить скриншот'));
  }
  return res.json();
}

/**
 * Загружает файл скриншота как blob (для превью в <img> — прямая ссылка закрыта авторизацией).
 * Возвращает object URL; не забудьте отозвать через URL.revokeObjectURL.
 */
export async function fetchAdminScreenshotObjectUrl(id: string): Promise<string> {
  await ensureFreshAccessToken(0);
  const token = getStoredAccessToken();
  if (!token) throw new Error('Нет авторизации');
  const res = await apiFetch(`${getApiBaseUrl()}/admin/screenshots/${id}/file`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Не удалось загрузить изображение скриншота');
  return URL.createObjectURL(await res.blob());
}

/** Скачивает файл скриншота на компьютер (через blob + <a download>). */
export async function downloadAdminScreenshot(item: AdminScreenshotItem): Promise<void> {
  await ensureFreshAccessToken(0);
  const token = getStoredAccessToken();
  if (!token) throw new Error('Нет авторизации');
  const res = await apiFetch(`${getApiBaseUrl()}/admin/screenshots/${item.id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Не удалось скачать скриншот');

  const objectUrl = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = item.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Удаляет скриншот (автор — свой, суперадмин — любой). */
export function deleteAdminScreenshot(id: string): Promise<{ success: boolean }> {
  return authedFetch(`/admin/screenshots/${id}`, { method: 'DELETE' }).then((res) => res.json());
}
