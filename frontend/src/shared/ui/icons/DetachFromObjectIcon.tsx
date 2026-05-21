export const ADMIN_DETACH_FROM_OBJECT_ICON_SIZE = 14;

export type DetachFromObjectIconProps = {
  size?: number;
  className?: string;
};

/** Исключить договор из объекта (минус). */
export function DetachFromObjectIcon({
  size = ADMIN_DETACH_FROM_OBJECT_ICON_SIZE,
  className,
}: DetachFromObjectIconProps) {
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
      <path d="M5 12h14" />
    </svg>
  );
}
