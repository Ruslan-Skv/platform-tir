import type { QuizConsentConfig } from '@/features/quiz/lib/quiz-consent';
import { serverFetch } from '@/shared/lib/fetch-with-timeout';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

export async function loadSitePrivacyPolicyConfig(): Promise<Partial<QuizConsentConfig> | null> {
  try {
    const res = await serverFetch(`${getServerApiBaseUrl()}/user-cabinet/settings`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
