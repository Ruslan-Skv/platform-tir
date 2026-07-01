import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const CACHE_TTL_MS = 30_000;

let settingsCache: { quizTimePerQuestionSeconds: number; at: number } | null = null;
let settingsInFlight: Promise<{ quizTimePerQuestionSeconds: number }> | null = null;

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function invalidateKnowledgeQuizPlatformSettingsCache(): void {
  settingsCache = null;
}

export function seedKnowledgeQuizPlatformSettingsCache(quizTimePerQuestionSeconds: number): void {
  settingsCache = { quizTimePerQuestionSeconds, at: Date.now() };
}

export async function fetchKnowledgeQuizPlatformSettings(): Promise<{
  quizTimePerQuestionSeconds: number;
}> {
  const now = Date.now();
  if (settingsCache && now - settingsCache.at < CACHE_TTL_MS) {
    return { quizTimePerQuestionSeconds: settingsCache.quizTimePerQuestionSeconds };
  }

  if (settingsInFlight) {
    return settingsInFlight;
  }

  settingsInFlight = apiFetch(`${API_URL}/admin/knowledge/quiz-settings`, {
    headers: getAuthHeaders(),
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error('Не удалось загрузить настройки тестов');
      }
      const data = (await res.json()) as { quizTimePerQuestionSeconds: number };
      settingsCache = {
        quizTimePerQuestionSeconds: data.quizTimePerQuestionSeconds,
        at: Date.now(),
      };
      return data;
    })
    .finally(() => {
      settingsInFlight = null;
    });

  return settingsInFlight;
}
