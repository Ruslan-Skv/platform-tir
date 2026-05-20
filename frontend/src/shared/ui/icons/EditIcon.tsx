import './EditIcon.module.css';

/** Глобальный класс для единого цвета «Редактировать» (токен --admin-icon-edit в layout) */
export const ADMIN_ACTION_ICON_EDIT_CLASS = 'admin-action-icon-edit';

/** Размер иконки «Редактировать» в кнопках действий админки (14×14) */
export const ADMIN_EDIT_ICON_SIZE = 14;

export type EditIconProps = {
  size?: number;
  className?: string;
  /** `edit` — синий тон админки; `inherit` — цвет от родителя */
  tone?: 'edit' | 'inherit';
};

/** Иконка «Редактировать» (карандаш, stroke), единый вид по проекту */
export function EditIcon({ size = ADMIN_EDIT_ICON_SIZE, className, tone = 'edit' }: EditIconProps) {
  const classes = [tone === 'edit' ? ADMIN_ACTION_ICON_EDIT_CLASS : undefined, className]
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
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
