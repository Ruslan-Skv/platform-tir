export interface QuizOption {
  value: string;
  label: string;
  imageUrl?: string;
}

export interface QuizShowWhen {
  branchKey: string;
  values: string[];
}

export type QuizStepType = 'choice' | 'text' | 'contact';

export const FURNITURE_QUIZ_SLUG = 'mebel';

export const FURNITURE_TYPE_PARAM = 'type';

/** Допустимые значения ?type= для пропуска первого шага */
export const FURNITURE_TYPE_VALUES = [
  'kitchen',
  'wardrobe',
  'dressing_room',
  'bedroom',
  'other',
] as const;

export type FurnitureTypeValue = (typeof FURNITURE_TYPE_VALUES)[number];

export interface QuizTheme {
  background: string;
  backgroundImageUrl?: string | null;
  backgroundImageOpacity: number;
  backgroundImageBrightness: number;
  textColor: string;
  headingColor: string;
  mutedTextColor: string;
  cardBackground: string;
  cardBorder: string;
  /** Макс. ширина блока шагов, px */
  stepBlockMaxWidth: number;
  /** Внутренние отступы блока шагов, px */
  stepBlockPadding: number;
  /** Скругление блока шагов, px */
  stepBlockBorderRadius: number;
  accentColor: string;
  buttonTextColor: string;
  fontFamily: string;
  headingFontFamily: string;
  cityBadgeBackground: string;
  cityBadgeBackgroundOpacity: number;
  cityBadgeTextColor: string;
  cityBadgeIconColor: string;
  cityBadgeBorderColor: string;
  cityBadgeFontSize: number;
  cityBadgePaddingX: number;
  cityBadgePaddingY: number;
  cityBadgeBorderRadius: number;
  cityBadgeIconSize: number;
  cityBadgeBorderWidth: number;
  cityBadgeShadowOpacity: number;
}

/** Фон как на territory-interior.ru (светлая тема, light-fon.png) */
export const DEFAULT_QUIZ_THEME: QuizTheme = {
  background: '#f8fafc',
  backgroundImageUrl: '/images/light-fon.png',
  backgroundImageOpacity: 100,
  backgroundImageBrightness: 100,
  textColor: '#1a202c',
  headingColor: '#1a202c',
  mutedTextColor: '#4a5568',
  cardBackground: 'rgba(255, 255, 255, 0.88)',
  cardBorder: 'rgba(0, 0, 0, 0.08)',
  stepBlockMaxWidth: 720,
  stepBlockPadding: 20,
  stepBlockBorderRadius: 16,
  accentColor: '#d90652',
  buttonTextColor: '#ffffff',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headingFontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  cityBadgeBackground: '#e1ddd0',
  cityBadgeBackgroundOpacity: 100,
  cityBadgeTextColor: '#3c331f',
  cityBadgeIconColor: '#3c331f',
  cityBadgeBorderColor: '#000000',
  cityBadgeFontSize: 16,
  cityBadgePaddingX: 18,
  cityBadgePaddingY: 7,
  cityBadgeBorderRadius: 30,
  cityBadgeIconSize: 16,
  cityBadgeBorderWidth: 1,
  cityBadgeShadowOpacity: 35,
};

export const QUIZ_SUBMISSION_STATUSES = [
  'new',
  'contacted',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type QuizSubmissionStatus = (typeof QUIZ_SUBMISSION_STATUSES)[number];

/** Путь к дефолтной картинке варианта (public/quiz/defaults) */
export function quizDefaultImage(name: string): string {
  return `/quiz/defaults/${name}.svg`;
}
