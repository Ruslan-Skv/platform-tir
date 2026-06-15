import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { hasPrivacyPolicyView, resolveQuizConsent } from '@/features/quiz/lib/quiz-consent';
import { FURNITURE_QUIZ_SLUG } from '@/features/quiz/lib/quiz-flow';
import { fetchQuizConfig } from '@/shared/api/quiz';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { PrivacyPolicyPageView } from '@/views/quiz/ui/PrivacyPolicyPage/PrivacyPolicyPageView';

async function loadQuizConfig() {
  const headersList = await headers();
  const host = headersList.get('x-quiz-host') || headersList.get('host') || undefined;
  try {
    return await fetchQuizConfig({
      host: host?.split(':')[0],
      slug: FURNITURE_QUIZ_SLUG,
      apiBase: getServerApiBaseUrl(),
    });
  } catch {
    return null;
  }
}

export default async function QuizPrivacyPolicyPage() {
  const config = await loadQuizConfig();
  if (!config || !hasPrivacyPolicyView(resolveQuizConsent(config))) {
    notFound();
  }

  return <PrivacyPolicyPageView config={config} />;
}
