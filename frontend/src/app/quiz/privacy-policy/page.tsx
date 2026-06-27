import { notFound } from 'next/navigation';

import { hasPrivacyPolicyView, resolveQuizConsent } from '@/features/quiz/lib/quiz-consent';
import { loadSitePrivacyPolicyConfig } from '@/features/site-consent/load-site-privacy-policy-config';
import { PrivacyPolicyPageView } from '@/views/quiz/ui/PrivacyPolicyPage/PrivacyPolicyPageView';

export default async function QuizPrivacyPolicyPage() {
  const config = await loadSitePrivacyPolicyConfig();
  if (!config || !hasPrivacyPolicyView(resolveQuizConsent(config))) {
    notFound();
  }

  return <PrivacyPolicyPageView config={config} />;
}
