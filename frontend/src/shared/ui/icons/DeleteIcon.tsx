import './DeleteIcon.module.css';

/** Глобальный класс для единого цвета «Удалить» (токен --admin-icon-delete в layout) */
export const ADMIN_ACTION_ICON_DELETE_CLASS = 'admin-action-icon-delete';

/** Размер иконки «Удалить» в кнопках действий админки (14×14) */
export const ADMIN_DELETE_ICON_SIZE = 14;

export type DeleteIconProps = {
  size?: number;
  className?: string;
  /** `delete` — красный тон админки; `inherit` — цвет от родителя */
  tone?: 'delete' | 'inherit';
};

/** Иконка «Удалить» (корзина, stroke), единый вид по проекту */
export function DeleteIcon({
  size = ADMIN_DELETE_ICON_SIZE,
  className,
  tone = 'delete',
}: DeleteIconProps) {
  const classes = [tone === 'delete' ? ADMIN_ACTION_ICON_DELETE_CLASS : undefined, className]
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
