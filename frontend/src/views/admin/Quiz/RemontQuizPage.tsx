'use client';

import { QuizAdminPageView } from '@/views/admin/Quiz/MebelQuizPageView';
import { useQuizAdminPage } from '@/views/admin/Quiz/hooks/useQuizAdminPage';
import { REMONT_QUIZ_ADMIN_CONFIG } from '@/views/admin/Quiz/quiz-admin.config';

export function RemontQuizPage() {
  const model = useQuizAdminPage(REMONT_QUIZ_ADMIN_CONFIG);
  return <QuizAdminPageView model={model} />;
}
