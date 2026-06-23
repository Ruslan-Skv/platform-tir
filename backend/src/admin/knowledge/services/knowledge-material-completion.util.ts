import { KnowledgeMaterialType } from '@prisma/client';

export type KnowledgeMaterialCompletionInput = {
  type: KnowledgeMaterialType | string;
  myQuizStatus?: { hasQuiz: boolean; passed: boolean } | null;
  myVideoProgress?: { completed: boolean } | null;
  studyCompleted?: boolean;
};

/** Материал считается изученным для последовательного доступа. */
export function isKnowledgeMaterialStudyCompleted(
  material: KnowledgeMaterialCompletionInput,
): boolean {
  if (material.type === KnowledgeMaterialType.VIDEO) {
    return Boolean(material.myVideoProgress?.completed);
  }

  if (material.myQuizStatus?.hasQuiz) {
    return Boolean(material.myQuizStatus.passed);
  }

  return Boolean(material.studyCompleted);
}
