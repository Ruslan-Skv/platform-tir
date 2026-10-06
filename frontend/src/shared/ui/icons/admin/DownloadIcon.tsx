export const ADMIN_DOWNLOAD_ICON_SIZE = 14;

export type DownloadIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Скачать» (стрелка в лоток) для кнопок действий админки. */
export function DownloadIcon({ size = ADMIN_DOWNLOAD_ICON_SIZE, className }: DownloadIconProps) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
