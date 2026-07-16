export const ADMIN_MERGE_ICON_SIZE = 14;

export type MergeIconProps = {
  size?: number;
  className?: string;
};

/** Объединить (две ветки → одна). */
export function MergeIcon({ size = ADMIN_MERGE_ICON_SIZE, className }: MergeIconProps) {
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
      className={className}
      aria-hidden
    >
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 21V9a9 9 0 0 0 9 9" />
    </svg>
  );
}
