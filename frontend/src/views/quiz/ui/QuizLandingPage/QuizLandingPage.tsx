import { Suspense } from 'react';

import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { FURNITURE_QUIZ_SLUG } from '@/features/quiz/lib/quiz-flow';
import { QuizWizard } from '@/features/quiz/ui/QuizWizard';
import { fetchQuizConfig } from '@/shared/api/quiz';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

import styles from './QuizLandingPage.module.css';

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

export async function QuizLandingPage() {
  const config = await loadQuizConfig();
  if (!config) {
    notFound();
  }

  return (
    <main className={styles.main}>
      <Suspense fallback={<p className={styles.loading}>Загрузка квиза…</p>}>
        <QuizWizard config={config} />
      </Suspense>
    </main>
  );
}
