import type React from 'react';

type IconProps = { className?: string };

/** Иконка раздела «Полезные статьи» для мобильной навигации */
export function UsefulArticlesNavIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 3h9a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2z" />
      <path d="M8 8h7M8 12h7M8 16h4" />
    </svg>
  );
}

/** Иконка раздела «Наши работы» для мобильной навигации */
export function OurWorksNavIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="M21 9v12a1 1 0 0 1-1 1H9" />
      <circle cx="8" cy="10" r="1.25" />
      <path d="m7 16 2.5-2.5 2 2L16 11" />
    </svg>
  );
}
