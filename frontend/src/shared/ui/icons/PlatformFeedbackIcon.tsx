import styles from './PlatformFeedbackIcon.module.css';

export const ADMIN_PLATFORM_FEEDBACK_ICON_SIZE = 14;

export type PlatformFeedbackIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Предложения и ошибки» (сообщение с карандашом) — для просмотра обратной связи */
export function PlatformFeedbackIcon({
  size = ADMIN_PLATFORM_FEEDBACK_ICON_SIZE,
  className,
}: PlatformFeedbackIconProps) {
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
      className={[styles.icon, className].filter(Boolean).join(' ')}
      aria-hidden
    >
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="m13.5 8.5-5 5" />
      <path d="M12.5 9.5h.01" />
      <path d="M8.5 13.5h.01" />
    </svg>
  );
}
