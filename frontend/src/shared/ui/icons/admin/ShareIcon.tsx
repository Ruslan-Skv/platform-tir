import './ShareIcon.module.css';

/** Глобальный класс для единого цвета «Отправить» (токен --admin-icon-share в layout) */
export const ADMIN_ACTION_ICON_SHARE_CLASS = 'admin-action-icon-share';

/** Размер иконки «Отправить» в кнопках действий админки (14×14) */
export const ADMIN_SHARE_ICON_SIZE = 14;

export type ShareIconProps = {
  size?: number;
  className?: string;
  tone?: 'share' | 'inherit';
};

/** Иконка «Отправить монтажнику» (бумажный самолётик). */
export function ShareIcon({
  size = ADMIN_SHARE_ICON_SIZE,
  className,
  tone = 'share',
}: ShareIconProps) {
  const classes = [tone === 'share' ? ADMIN_ACTION_ICON_SHARE_CLASS : undefined, className]
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
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
