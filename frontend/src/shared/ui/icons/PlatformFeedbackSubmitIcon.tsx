import styles from './PlatformFeedbackSubmitIcon.module.css';

export const ADMIN_PLATFORM_FEEDBACK_SUBMIT_ICON_SIZE = 24;

const ICON_SRC = '/icons/knowledge-platform-feedback.png';

export type PlatformFeedbackSubmitIconProps = {
  size?: number;
  className?: string;
};

/** Иконка отправки обратной связи (PNG) */
export function PlatformFeedbackSubmitIcon({
  size = ADMIN_PLATFORM_FEEDBACK_SUBMIT_ICON_SIZE,
  className,
}: PlatformFeedbackSubmitIconProps) {
  return (
    <img
      src={ICON_SRC}
      alt=""
      width={size}
      height={size}
      className={[styles.icon, className].filter(Boolean).join(' ')}
      aria-hidden
    />
  );
}
