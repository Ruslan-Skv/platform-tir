import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import { loadQuizConfigFromRequest } from '@/features/quiz/lib/load-quiz-config';
import { QuizWizard } from '@/features/quiz/ui/QuizWizard';

import styles from './QuizLandingPage.module.css';

export async function QuizLandingPage() {
  const config = await loadQuizConfigFromRequest();
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
