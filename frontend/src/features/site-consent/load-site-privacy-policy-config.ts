import type { QuizConsentConfig } from '@/features/quiz/lib/quiz-consent';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

export async function loadSitePrivacyPolicyConfig(): Promise<Partial<QuizConsentConfig> | null> {
  try {
    const res = await fetch(`${getServerApiBaseUrl()}/user-cabinet/settings`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
