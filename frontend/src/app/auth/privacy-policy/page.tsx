import { notFound } from 'next/navigation';

import { hasPrivacyPolicyView, resolveQuizConsent } from '@/features/quiz/lib/quiz-consent';
import { loadSitePrivacyPolicyConfig } from '@/features/site-consent/load-site-privacy-policy-config';
import { PrivacyPolicyPageView } from '@/views/quiz/ui/PrivacyPolicyPage/PrivacyPolicyPageView';

export default async function RegistrationPrivacyPolicyPage() {
  const settings = await loadSitePrivacyPolicyConfig();
  if (!settings || !hasPrivacyPolicyView(resolveQuizConsent(settings))) {
    notFound();
  }

  return <PrivacyPolicyPageView config={settings} />;
}
