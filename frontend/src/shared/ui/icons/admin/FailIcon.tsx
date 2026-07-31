import './FailIcon.module.css';

/** Глобальный класс для единого цвета «Не выполнено» */
export const ADMIN_ACTION_ICON_FAIL_CLASS = 'admin-action-icon-fail';

export const ADMIN_FAIL_ICON_SIZE = 14;

export type FailIconProps = {
  size?: number;
  className?: string;
  /** `fail` — красный тон админки; `inherit` — цвет от родителя */
  tone?: 'fail' | 'inherit';
};

/** Иконка «Не выполнено» (крестик в круге, stroke) */
export function FailIcon({ size = ADMIN_FAIL_ICON_SIZE, className, tone = 'fail' }: FailIconProps) {
  const classes = [tone === 'fail' ? ADMIN_ACTION_ICON_FAIL_CLASS : undefined, className]
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
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
