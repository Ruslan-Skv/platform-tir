import type { Metadata } from 'next';

import { loadQuizConfigFromRequest } from '@/features/quiz/lib/load-quiz-config';
import { QuizLandingPage } from '@/views/quiz/ui/QuizLandingPage/QuizLandingPage';

export async function generateMetadata(): Promise<Metadata> {
  const config = await loadQuizConfigFromRequest();
  if (!config) {
    return {
      title: 'Квиз',
      robots: { index: false, follow: false },
    };
  }

  const title = config.headline?.trim() || config.title?.trim() || 'Расчёт стоимости';

  return {
    title,
    description: config.subheadline?.trim() || config.promoText?.trim() || undefined,
    robots: { index: false, follow: false },
  };
}

export default function QuizPage() {
  return <QuizLandingPage />;
}
