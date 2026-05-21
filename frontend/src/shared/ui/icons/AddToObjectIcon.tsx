export const ADMIN_ADD_TO_OBJECT_ICON_SIZE = 14;

export type AddToObjectIconProps = {
  size?: number;
  className?: string;
};

/** Добавить договоры в объект (плюс). */
export function AddToObjectIcon({
  size = ADMIN_ADD_TO_OBJECT_ICON_SIZE,
  className,
}: AddToObjectIconProps) {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
