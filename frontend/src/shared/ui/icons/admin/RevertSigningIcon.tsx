import './RevertSigningIcon.module.css';

/** Глобальный класс для цвета «Отменить подписание» (токены --admin-icon-revert-* в layout) */
export const ADMIN_ACTION_ICON_REVERT_CLASS = 'admin-action-icon-revert';

/** Размер иконки «Отменить подписание» в кнопках действий админки (14×14) */
export const ADMIN_REVERT_SIGNING_ICON_SIZE = 14;

export type RevertSigningIconProps = {
  size?: number;
  className?: string;
  /** `revert` — двухцветный тон админки (колокольчик/черта); `inherit` — цвет от родителя */
  tone?: 'revert' | 'inherit';
};

/**
 * Иконка «Отменить подписание» (перечёркнутый колокольчик, stroke), единый вид по проекту:
 * колокольчик — синий токен, перечёркивающая черта — красный (как в исходной icons8).
 */
export function RevertSigningIcon({
  size = ADMIN_REVERT_SIGNING_ICON_SIZE,
  className,
  tone = 'revert',
}: RevertSigningIconProps) {
  const classes = [tone === 'revert' ? ADMIN_ACTION_ICON_REVERT_CLASS : undefined, className]
    .filter(Boolean)
    .join(' ');
  const bellStroke = tone === 'revert' ? 'var(--admin-icon-revert-bell)' : 'currentColor';
  const slashStroke = tone === 'revert' ? 'var(--admin-icon-revert-slash)' : 'currentColor';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={classes || undefined}
      aria-hidden
    >
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={bellStroke} />
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" stroke={bellStroke} />
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" stroke={bellStroke} />
      <path d="M18 8a6 6 0 0 0-9.33-5" stroke={bellStroke} />
      <line x1="1" y1="1" x2="22" y2="22" stroke={slashStroke} />
    </svg>
  );
}
