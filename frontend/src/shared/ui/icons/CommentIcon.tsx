import styles from './CommentIcon.module.css';

export const ADMIN_COMMENT_ICON_SIZE = 14;

export type CommentIconProps = {
  size?: number;
  className?: string;
  active?: boolean;
};

/** Иконка «Комментарии» (облачко диалога) */
export function CommentIcon({
  size = ADMIN_COMMENT_ICON_SIZE,
  className,
  active = false,
}: CommentIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={[styles.icon, active ? styles.iconActive : styles.iconInactive, className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4 8.5 8.5 0 0 1-6.6 3.1 8.38 8.38 0 0 1-3.9-.9L3 21l1.9-5.6a8.38 8.38 0 0 1-.9-3.9 8.5 8.5 0 0 1 3.1-6.6 8.38 8.38 0 0 1 5.4-1.9H12a8.5 8.5 0 0 1 8 8.5z" />
    </svg>
  );
}
