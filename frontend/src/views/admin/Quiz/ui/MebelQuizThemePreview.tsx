import type { CSSProperties } from 'react';

import { headerBadgePreviewStyle, quizThemeToCssVars } from '@/features/quiz/lib/quiz-theme';
import { resolveAdminUploadUrl } from '@/shared/api/admin-quiz';
import type { QuizTheme } from '@/shared/api/quiz-theme';

import styles from './MebelQuizThemePreview.module.css';

type MebelQuizThemePreviewProps = {
  theme: QuizTheme;
  headline?: string | null;
  subheadline?: string | null;
  promoText?: string | null;
  city?: string | null;
  displayPhone?: string | null;
};

function themePreviewRootStyle(theme: QuizTheme): CSSProperties {
  const vars = quizThemeToCssVars(theme);
  if (!theme.backgroundImageUrl) return vars;
  return {
    ...vars,
    ['--quiz-preview-bg-image' as string]: `url(${resolveAdminUploadUrl(theme.backgroundImageUrl)})`,
  };
}

export function MebelQuizThemePreview({
  theme,
  headline,
  subheadline,
  promoText,
  city,
  displayPhone,
}: MebelQuizThemePreviewProps) {
  const badgeStyle = headerBadgePreviewStyle(theme);

  return (
    <div className={styles.themePreview} style={themePreviewRootStyle(theme)}>
      {theme.backgroundImageUrl ? <div className={styles.themePreviewBg} aria-hidden /> : null}
      <div className={styles.themePreviewContent}>
        <div className={styles.themePreviewBadges}>
          <span className={styles.themePreviewCityBadge} style={badgeStyle}>
            <svg
              width={theme.cityBadgeIconSize}
              height={theme.cityBadgeIconSize}
              viewBox="0 0 24 24"
              fill={theme.cityBadgeIconColor}
              aria-hidden
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
            </svg>
            {city || 'Город'}
          </span>
          <span className={styles.themePreviewCityBadge} style={badgeStyle}>
            <svg
              width={theme.cityBadgeIconSize}
              height={theme.cityBadgeIconSize}
              viewBox="0 0 24 24"
              fill={theme.cityBadgeIconColor}
              aria-hidden
            >
              <path d="M6.62 10.79a15.91 15.91 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24 11.36 11.36 0 0 0 3.56.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.56 1 1 0 0 1-.25 1.01l-2.2 2.22z" />
            </svg>
            {displayPhone || '+7 (XXX) XXX-XX-XX'}
          </span>
        </div>
        <h3 className={styles.themePreviewHeading}>{headline || 'Заголовок квиза'}</h3>
        <p className={styles.themePreviewSubheadline}>{subheadline || 'Подзаголовок'}</p>
        {promoText ? <p className={styles.themePreviewPromo}>{promoText}</p> : null}
        <div className={styles.themePreviewCard}>
          <p className={styles.themePreviewStepText}>Пример вопроса в блоке шагов</p>
          <div className={styles.themePreviewChoiceGrid}>
            <div className={styles.themePreviewChoiceCard}>
              <span className={styles.themePreviewChoiceImage} aria-hidden />
              <span className={styles.themePreviewChoiceLabel}>Вариант</span>
            </div>
            <div
              className={`${styles.themePreviewChoiceCard} ${styles.themePreviewChoiceCardSelected}`}
            >
              <span className={styles.themePreviewChoiceImage} aria-hidden />
              <span className={styles.themePreviewChoiceLabel}>Выбран</span>
            </div>
          </div>
          <div className={styles.themePreviewActions}>
            <button type="button" className={styles.themePreviewBackButton}>
              Назад
            </button>
            <button type="button" className={styles.themePreviewButton}>
              Далее
            </button>
          </div>
        </div>
        <div className={styles.themePreviewSuccess}>
          <p className={styles.themePreviewSuccessTitle}>Спасибо!</p>
          <p className={styles.themePreviewSuccessText}>Текст экрана благодарности</p>
        </div>
      </div>
    </div>
  );
}
