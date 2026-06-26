import type { QuizStepConfig } from '@/shared/api/quiz';

export const FURNITURE_QUIZ_SLUG = 'mebel';
export const REMONT_QUIZ_SLUG = 'remont';
export const QUIZ_PREFILL_PARAM = 'type';

export const FURNITURE_TYPE_VALUES = [
  'kitchen',
  'wardrobe',
  'dressing_room',
  'bedroom',
  'other',
] as const;

export type FurnitureTypeValue = (typeof FURNITURE_TYPE_VALUES)[number];

export function isValidFurnitureType(
  value: string | null | undefined
): value is FurnitureTypeValue {
  return !!value && (FURNITURE_TYPE_VALUES as readonly string[]).includes(value);
}

/** Первый шаг choice без ветвления */
export function getPrimaryChoiceStep(steps: QuizStepConfig[]): QuizStepConfig | undefined {
  return [...steps]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .find((step) => step.type === 'choice' && !step.showWhen);
}

export function getQuizPrefillFromParam(
  steps: QuizStepConfig[],
  paramValue: string | null | undefined
): { skipKeys: string[]; initialAnswers: Record<string, string> } {
  const primaryStep = getPrimaryChoiceStep(steps);
  if (!primaryStep?.options || !paramValue) {
    return { skipKeys: [], initialAnswers: {} };
  }
  const isValid = primaryStep.options.some((o) => o.value === paramValue);
  if (!isValid) {
    return { skipKeys: [], initialAnswers: {} };
  }
  return {
    skipKeys: [primaryStep.key],
    initialAnswers: { [primaryStep.key]: paramValue },
  };
}

export function isStepVisible(step: QuizStepConfig, answers: Record<string, string>): boolean {
  if (!step.showWhen) return true;
  const branchValue = answers[step.showWhen.branchKey];
  if (!branchValue) return false;
  return step.showWhen.values.includes(branchValue);
}

/** Шаги с учётом ветвления и пропуска уже заполненных (напр. furniture_type из ?type=) */
export function getVisibleSteps(
  steps: QuizStepConfig[],
  answers: Record<string, string>,
  skipKeys: string[] = []
): QuizStepConfig[] {
  return steps
    .filter((step) => !skipKeys.includes(step.key))
    .filter((step) => isStepVisible(step, answers))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getOptionLabel(
  step: QuizStepConfig | undefined,
  value: string | undefined
): string {
  if (!step?.options || !value) return value ?? '';
  return step.options.find((o) => o.value === value)?.label ?? value;
}
