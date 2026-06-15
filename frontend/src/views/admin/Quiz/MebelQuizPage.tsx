'use client';

import { MebelQuizPageView } from '@/views/admin/Quiz/MebelQuizPageView';
import { useMebelQuizPage } from '@/views/admin/Quiz/hooks/useMebelQuizPage';

export function MebelQuizPage() {
  const model = useMebelQuizPage();
  return <MebelQuizPageView model={model} />;
}
