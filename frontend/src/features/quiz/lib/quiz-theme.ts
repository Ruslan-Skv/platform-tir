import type { CSSProperties } from 'react';

import type { QuizTheme } from '@/shared/api/quiz-theme';
import { DEFAULT_QUIZ_THEME } from '@/shared/api/quiz-theme';

export function cityBadgeBackgroundCss(color: string, opacityPercent: number): string {
  const opacity = Math.min(100, Math.max(0, opacityPercent));
  return `color-mix(in srgb, ${color} ${opacity}%, transparent)`;
}

export function headerBadgePreviewStyle(theme: QuizTheme): CSSProperties {
  return {
    gap: theme.cityBadgeIconSize * 0.25,
    padding: `${theme.cityBadgePaddingY}px ${theme.cityBadgePaddingX}px`,
    background: cityBadgeBackgroundCss(theme.cityBadgeBackground, theme.cityBadgeBackgroundOpacity),
    border: `${theme.cityBadgeBorderWidth}px solid ${theme.cityBadgeBorderColor}`,
    borderRadius: theme.cityBadgeBorderRadius,
    boxShadow: `3px 2px 5px rgba(0, 0, 0, ${theme.cityBadgeShadowOpacity / 100})`,
    fontSize: theme.cityBadgeFontSize,
    color: theme.cityBadgeTextColor,
  };
}

export function mergeQuizTheme(
  theme: Partial<QuizTheme> | null | undefined,
  primaryColor?: string | null
): QuizTheme {
  const accent = theme?.accentColor || primaryColor || DEFAULT_QUIZ_THEME.accentColor;

  if (!theme) {
    return { ...DEFAULT_QUIZ_THEME, accentColor: accent };
  }

  const backgroundImageUrl = !('backgroundImageUrl' in theme)
    ? DEFAULT_QUIZ_THEME.backgroundImageUrl
    : theme.backgroundImageUrl === '' || theme.backgroundImageUrl === null
      ? null
      : theme.backgroundImageUrl;

  return {
    ...DEFAULT_QUIZ_THEME,
    ...theme,
    backgroundImageUrl,
    accentColor: accent,
  };
}

export function quizThemeToCssVars(theme: QuizTheme): CSSProperties {
  const shadowOpacity = Math.min(100, Math.max(0, theme.cityBadgeShadowOpacity)) / 100;
  return {
    ['--quiz-bg' as string]: theme.background,
    ['--quiz-bg-image-opacity' as string]: String(
      Math.min(100, Math.max(0, theme.backgroundImageOpacity)) / 100
    ),
    ['--quiz-bg-image-brightness' as string]: String(
      Math.min(200, Math.max(0, theme.backgroundImageBrightness)) / 100
    ),
    ['--quiz-text' as string]: theme.textColor,
    ['--quiz-heading' as string]: theme.headingColor,
    ['--quiz-muted' as string]: theme.mutedTextColor,
    ['--quiz-card-bg' as string]: theme.cardBackground,
    ['--quiz-card-border' as string]: theme.cardBorder,
    ['--quiz-step-block-max-width' as string]: `${theme.stepBlockMaxWidth}px`,
    ['--quiz-step-block-padding' as string]: `${theme.stepBlockPadding}px`,
    ['--quiz-step-block-radius' as string]: `${theme.stepBlockBorderRadius}px`,
    ['--quiz-accent' as string]: theme.accentColor,
    ['--quiz-btn-text' as string]: theme.buttonTextColor,
    ['--quiz-font' as string]: theme.fontFamily,
    ['--quiz-heading-font' as string]: theme.headingFontFamily,
    ['--quiz-header-badge-bg' as string]: theme.cityBadgeBackground,
    ['--quiz-header-badge-bg-opacity' as string]: String(
      Math.min(100, Math.max(0, theme.cityBadgeBackgroundOpacity)) / 100
    ),
    ['--quiz-header-badge-text' as string]: theme.cityBadgeTextColor,
    ['--quiz-header-badge-icon-color' as string]: theme.cityBadgeIconColor,
    ['--quiz-header-badge-border' as string]: theme.cityBadgeBorderColor,
    ['--quiz-header-badge-font-size' as string]: `${theme.cityBadgeFontSize}px`,
    ['--quiz-header-badge-px' as string]: `${theme.cityBadgePaddingX}px`,
    ['--quiz-header-badge-py' as string]: `${theme.cityBadgePaddingY}px`,
    ['--quiz-header-badge-radius' as string]: `${theme.cityBadgeBorderRadius}px`,
    ['--quiz-header-badge-icon-size' as string]: `${theme.cityBadgeIconSize}px`,
    ['--quiz-header-badge-border-width' as string]: `${theme.cityBadgeBorderWidth}px`,
    ['--quiz-header-badge-shadow-opacity' as string]: String(shadowOpacity),
  };
}

export function resolveQuizImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/quiz/') || url.startsWith('/images/')) return url;
  if (url.startsWith('/uploads/')) {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const base = api.replace(/\/api\/v1\/?$/, '');
    return `${base}${url}`;
  }
  return url;
}
