import './CopyIcon.module.css';

/** Глобальный класс для единого цвета «Копировать» (токен --admin-icon-copy в layout) */
export const ADMIN_ACTION_ICON_COPY_CLASS = 'admin-action-icon-copy';

/** Размер иконки «Копировать» в кнопках действий админки (14×14) */
export const ADMIN_COPY_ICON_SIZE = 14;

export type CopyIconProps = {
  size?: number;
  className?: string;
  /** `copy` — изумрудный тон админки; `inherit` — цвет от родителя */
  tone?: 'copy' | 'inherit';
};

/** Иконка «Копировать» (два листа, stroke), единый вид по проекту */
export function CopyIcon({ size = ADMIN_COPY_ICON_SIZE, className, tone = 'copy' }: CopyIconProps) {
  const classes = [tone === 'copy' ? ADMIN_ACTION_ICON_COPY_CLASS : undefined, className]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={classes || undefined}
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
