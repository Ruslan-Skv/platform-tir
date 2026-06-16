import './PublishIcon.module.css';

export const ADMIN_ACTION_ICON_PUBLISH_CLASS = 'admin-action-icon-publish';

export const ADMIN_PUBLISH_ICON_SIZE = 14;

export type PublishIconProps = {
  size?: number;
  className?: string;
  tone?: 'publish' | 'inherit';
};

/** Иконка «Опубликовать» (галочка в круге), единый вид по проекту */
export function PublishIcon({
  size = ADMIN_PUBLISH_ICON_SIZE,
  className,
  tone = 'publish',
}: PublishIconProps) {
  const classes = [tone === 'publish' ? ADMIN_ACTION_ICON_PUBLISH_CLASS : undefined, className]
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
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
