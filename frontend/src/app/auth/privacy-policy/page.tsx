import { notFound } from 'next/navigation';

import { hasPrivacyPolicyView, resolveQuizConsent } from '@/features/quiz/lib/quiz-consent';
import type { UserCabinetSettings } from '@/shared/api/user-cabinet';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { PrivacyPolicyPageView } from '@/views/quiz/ui/PrivacyPolicyPage/PrivacyPolicyPageView';

async function loadRegistrationConsentConfig(): Promise<UserCabinetSettings | null> {
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

export default async function RegistrationPrivacyPolicyPage() {
  const settings = await loadRegistrationConsentConfig();
  if (!settings || !hasPrivacyPolicyView(resolveQuizConsent(settings))) {
    notFound();
  }

  return <PrivacyPolicyPageView config={settings} />;
}
