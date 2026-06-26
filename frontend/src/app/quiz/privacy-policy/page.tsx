import { notFound } from 'next/navigation';

import { loadQuizConfigFromRequest } from '@/features/quiz/lib/load-quiz-config';
import { hasPrivacyPolicyView, resolveQuizConsent } from '@/features/quiz/lib/quiz-consent';
import { PrivacyPolicyPageView } from '@/views/quiz/ui/PrivacyPolicyPage/PrivacyPolicyPageView';

export default async function QuizPrivacyPolicyPage() {
  const config = await loadQuizConfigFromRequest();
  if (!config || !hasPrivacyPolicyView(resolveQuizConsent(config))) {
    notFound();
  }

  return <PrivacyPolicyPageView config={config} />;
}
