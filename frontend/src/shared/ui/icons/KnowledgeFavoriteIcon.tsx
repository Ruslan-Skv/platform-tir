import styles from './KnowledgeFavoriteIcon.module.css';

export const ADMIN_KNOWLEDGE_FAVORITE_ICON_SIZE = 14;

export type KnowledgeFavoriteIconProps = {
  size?: number;
  className?: string;
  /** Материал в избранном у текущего пользователя */
  favorited?: boolean;
};

/** Иконка «Избранное» (закладка) */
export function KnowledgeFavoriteIcon({
  size = ADMIN_KNOWLEDGE_FAVORITE_ICON_SIZE,
  className,
  favorited = false,
}: KnowledgeFavoriteIconProps) {
  return (
    <svg
      aria-hidden
      className={[styles.icon, favorited ? styles.iconFavorited : styles.iconUnfavorited, className]
        .filter(Boolean)
        .join(' ')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v15.1a.5.5 0 0 1-.78.41L12 17.2l-5.72 4.31A.5.5 0 0 1 5.5 21V6a1.5 1.5 0 0 1 1.5-1.5z"
        fill={favorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
