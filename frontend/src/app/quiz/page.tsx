import { Suspense } from 'react';

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { FURNITURE_QUIZ_SLUG } from '@/features/quiz/lib/quiz-flow';
import { QuizWizard } from '@/features/quiz/ui/QuizWizard';
import { fetchQuizConfig } from '@/shared/api/quiz';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

import styles from './quiz.module.css';

export const metadata: Metadata = {
  title: 'Мебель на заказ — расчёт стоимости',
  description: 'Рассчитайте стоимость мебели на заказ от производителя',
  robots: { index: false, follow: false },
};

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

export default async function QuizPage() {
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
