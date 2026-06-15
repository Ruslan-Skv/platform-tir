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
  stepBlockMaxWidth: number;
  stepBlockPadding: number;
  stepBlockBorderRadius: number;
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

export const QUIZ_SUBMISSION_STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  contacted: 'Связались',
  in_progress: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

export const FURNITURE_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Кухня',
  wardrobe: 'Шкаф',
  dressing_room: 'Гардеробная',
  bedroom: 'Спальня',
  other: 'Другое',
};
