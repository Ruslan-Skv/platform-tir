import styles from './InterestingMaterialIcon.module.css';

export const ADMIN_INTERESTING_MATERIAL_ICON_SIZE = 14;

export type InterestingMaterialIconProps = {
  size?: number;
  className?: string;
  /** Пользователь отметил материал как интересный */
  marked?: boolean;
};

/** Иконка «Интересный материал» (звезда) */
export function InterestingMaterialIcon({
  size = ADMIN_INTERESTING_MATERIAL_ICON_SIZE,
  className,
  marked = false,
}: InterestingMaterialIconProps) {
  return (
    <svg
      aria-hidden
      className={[styles.icon, marked ? styles.iconMarked : styles.iconUnmarked, className]
        .filter(Boolean)
        .join(' ')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3.5l2.39 4.84 5.34.78-3.86 3.76.91 5.32L12 15.9l-4.78 2.3.91-5.32-3.86-3.76 5.34-.78L12 3.5z"
        fill={marked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
