import type { KnowledgeQuizPlatformSettings } from '@/shared/api/admin-knowledge';
import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const CACHE_TTL_MS = 30_000;

let settingsCache: (KnowledgeQuizPlatformSettings & { at: number }) | null = null;
let settingsInFlight: Promise<KnowledgeQuizPlatformSettings> | null = null;

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

export function seedKnowledgeQuizPlatformSettingsCache(
  settings: Partial<KnowledgeQuizPlatformSettings>
): void {
  settingsCache = {
    materialQuizTimePerQuestionSeconds:
      settings.materialQuizTimePerQuestionSeconds ??
      settingsCache?.materialQuizTimePerQuestionSeconds ??
      60,
    categoryQuizTimePerQuestionSeconds:
      settings.categoryQuizTimePerQuestionSeconds ??
      settingsCache?.categoryQuizTimePerQuestionSeconds ??
      60,
    materialQuizMaxAttemptsPerDay:
      settings.materialQuizMaxAttemptsPerDay ?? settingsCache?.materialQuizMaxAttemptsPerDay ?? 3,
    categoryQuizMaxAttemptsPerDay:
      settings.categoryQuizMaxAttemptsPerDay ?? settingsCache?.categoryQuizMaxAttemptsPerDay ?? 3,
    materialQuizRetryCooldownMinutes:
      settings.materialQuizRetryCooldownMinutes ??
      settingsCache?.materialQuizRetryCooldownMinutes ??
      30,
    categoryQuizRetryCooldownMinutes:
      settings.categoryQuizRetryCooldownMinutes ??
      settingsCache?.categoryQuizRetryCooldownMinutes ??
      30,
    at: Date.now(),
  };
}

export async function fetchKnowledgeQuizPlatformSettings(): Promise<KnowledgeQuizPlatformSettings> {
  const now = Date.now();
  if (settingsCache && now - settingsCache.at < CACHE_TTL_MS) {
    return {
      materialQuizTimePerQuestionSeconds: settingsCache.materialQuizTimePerQuestionSeconds,
      categoryQuizTimePerQuestionSeconds: settingsCache.categoryQuizTimePerQuestionSeconds,
      materialQuizMaxAttemptsPerDay: settingsCache.materialQuizMaxAttemptsPerDay,
      categoryQuizMaxAttemptsPerDay: settingsCache.categoryQuizMaxAttemptsPerDay,
      materialQuizRetryCooldownMinutes: settingsCache.materialQuizRetryCooldownMinutes,
      categoryQuizRetryCooldownMinutes: settingsCache.categoryQuizRetryCooldownMinutes,
    };
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
      const data = (await res.json()) as KnowledgeQuizPlatformSettings;
      settingsCache = { ...data, at: Date.now() };
      return data;
    })
    .finally(() => {
      settingsInFlight = null;
    });

  return settingsInFlight;
}
