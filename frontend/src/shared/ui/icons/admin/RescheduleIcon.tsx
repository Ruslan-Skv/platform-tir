import './RescheduleIcon.module.css';

/** Глобальный класс для единого цвета «Перенести» (токен --admin-icon-reschedule в layout) */
export const ADMIN_ACTION_ICON_RESCHEDULE_CLASS = 'admin-action-icon-reschedule';

/** Размер иконки «Перенести» в кнопках действий админки (14×14) */
export const ADMIN_RESCHEDULE_ICON_SIZE = 14;

export type RescheduleIconProps = {
  size?: number;
  className?: string;
  /** `reschedule` — акцент админки; `inherit` — цвет от родителя */
  tone?: 'reschedule' | 'inherit';
};

/** Иконка «Перенести на другой день» (календарь со стрелкой), единый вид по проекту */
export function RescheduleIcon({
  size = ADMIN_RESCHEDULE_ICON_SIZE,
  className,
  tone = 'reschedule',
}: RescheduleIconProps) {
  const classes = [
    tone === 'reschedule' ? ADMIN_ACTION_ICON_RESCHEDULE_CLASS : undefined,
    className,
  ]
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
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 16h5" />
      <path d="m15 13 3 3-3 3" />
    </svg>
  );
}
