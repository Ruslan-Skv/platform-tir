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
  headlineFontSize: number;
  headlineFontWeight: number;
  mutedTextColor: string;
  subheadlineFontSize: number;
  subheadlineFontWeight: number;
  promoTextColor: string;
  promoFontSize: number;
  promoFontWeight: number;
  stepBlockTextColor: string;
  successTitleColor: string;
  successTextColor: string;
  cardBackground: string;
  cardBorder: string;
  /** Макс. ширина блока шагов, px */
  stepBlockMaxWidth: number;
  /** Внутренние отступы блока шагов, px */
  stepBlockPadding: number;
  /** Скругление блока шагов, px */
  stepBlockBorderRadius: number;
  /** Карточек вариантов ответа в одной строке (3–6) */
  stepChoiceColumns: number;
  choiceCardBackground: string;
  choiceCardBorderColor: string;
  choiceCardBorderWidth: number;
  choiceCardBorderRadius: number;
  choiceCardPaddingX: number;
  choiceCardPaddingY: number;
  choiceCardGap: number;
  choiceCardImageHeight: number;
  choiceCardImageRadius: number;
  choiceCardSelectedBackground: string;
  choiceCardSelectedBorderColor: string;
  accentColor: string;
  buttonTextColor: string;
  backButtonTextColor: string;
  backButtonBorderColor: string;
  backButtonBackground: string;
  fontFamily: string;
  headingFontFamily: string;
  cityBadgeBackground: string;
  cityBadgeBackgroundOpacity: number;
  cityBadgeTextColor: string;
  cityBadgeIconColor: string;
  cityBadgeBorderColor: string;
  cityBadgeFontSize: number;
  cityBadgeFontWeight: number;
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
  headlineFontSize: 30,
  headlineFontWeight: 700,
  mutedTextColor: '#4a5568',
  subheadlineFontSize: 15,
  subheadlineFontWeight: 400,
  promoTextColor: '#d90652',
  promoFontSize: 14,
  promoFontWeight: 600,
  stepBlockTextColor: '#1a202c',
  successTitleColor: '#1a202c',
  successTextColor: '#4a5568',
  cardBackground: 'rgba(255, 255, 255, 0.88)',
  cardBorder: 'rgba(0, 0, 0, 0.08)',
  stepBlockMaxWidth: 720,
  stepBlockPadding: 20,
  stepBlockBorderRadius: 16,
  stepChoiceColumns: 4,
  choiceCardBackground: 'rgba(255, 255, 255, 0.95)',
  choiceCardBorderColor: 'rgba(0, 0, 0, 0.12)',
  choiceCardBorderWidth: 1,
  choiceCardBorderRadius: 12,
  choiceCardPaddingX: 8,
  choiceCardPaddingY: 8,
  choiceCardGap: 6,
  choiceCardImageHeight: 64,
  choiceCardImageRadius: 8,
  choiceCardSelectedBackground: '#ffffff',
  choiceCardSelectedBorderColor: '#d90652',
  accentColor: '#d90652',
  buttonTextColor: '#ffffff',
  backButtonTextColor: '#4a5568',
  backButtonBorderColor: 'rgba(0, 0, 0, 0.2)',
  backButtonBackground: 'rgba(255, 255, 255, 0.85)',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headingFontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  cityBadgeBackground: '#e1ddd0',
  cityBadgeBackgroundOpacity: 100,
  cityBadgeTextColor: '#3c331f',
  cityBadgeIconColor: '#3c331f',
  cityBadgeBorderColor: '#000000',
  cityBadgeFontSize: 16,
  cityBadgeFontWeight: 500,
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

export const DEFAULT_QUIZ_CONSENT = {
  consentText: 'Я согласен(-на) на обработку персональных данных',
  consentLinkText: 'персональных данных',
  privacyPolicyTitle: 'Политика конфиденциальности персональных данных',
} as const;

/** Путь к дефолтной картинке варианта (public/quiz/defaults) */
export function quizDefaultImage(name: string): string {
  return `/quiz/defaults/${name}.svg`;
}
