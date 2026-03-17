const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface DirectorMessageSettings {
  directorEmail: string | null;
  telegramChatId: string | null;
  updatedAt: string | null;
}

export async function getAdminDirectorMessageSettings(
  getAuthHeaders: () => Record<string, string>
): Promise<DirectorMessageSettings> {
  const res = await fetch(`${API_URL}/admin/forms/director-settings`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminDirectorMessageSettings(
  data: { directorEmail?: string | null; telegramChatId?: string | null },
  getAuthHeaders: () => Record<string, string>
): Promise<DirectorMessageSettings> {
  const res = await fetch(`${API_URL}/admin/forms/director-settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Не удалось сохранить настройки');
  }
  return res.json();
}
