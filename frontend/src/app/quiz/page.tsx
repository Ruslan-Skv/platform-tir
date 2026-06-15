import type { Metadata } from 'next';

import { QuizLandingPage } from '@/views/quiz/ui/QuizLandingPage/QuizLandingPage';

export const metadata: Metadata = {
  title: 'Мебель на заказ — расчёт стоимости',
  description: 'Рассчитайте стоимость мебели на заказ от производителя',
  robots: { index: false, follow: false },
};

export default function QuizPage() {
  return <QuizLandingPage />;
}
