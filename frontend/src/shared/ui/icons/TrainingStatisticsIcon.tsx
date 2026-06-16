export const ADMIN_TRAINING_STATISTICS_ICON_SIZE = 24;

export type TrainingStatisticsIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Статистика обучения» — круговой график (линейная диаграмма) */
export function TrainingStatisticsIcon({
  size = ADMIN_TRAINING_STATISTICS_ICON_SIZE,
  className,
}: TrainingStatisticsIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
    >
      <circle cx="32" cy="32" r="32" fill="#00AEEF" />
      <path d="M16 46V18" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 46H48" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 34H44" stroke="#fff" strokeWidth="0.75" opacity="0.85" />
      <path d="M22 26H44" stroke="#fff" strokeWidth="0.75" opacity="0.85" />
      <path d="M22 42H44" stroke="#fff" strokeWidth="0.75" opacity="0.85" />
      <path d="M28 18V46" stroke="#fff" strokeWidth="0.75" opacity="0.85" />
      <path d="M36 18V46" stroke="#fff" strokeWidth="0.75" opacity="0.85" />
      <path d="M44 18V46" stroke="#fff" strokeWidth="0.75" opacity="0.85" />
      <polyline
        points="18,40 27,27 37,33 46,20"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="40" r="2.5" fill="#fff" />
      <circle cx="27" cy="27" r="2.5" fill="#fff" />
      <circle cx="37" cy="33" r="2.5" fill="#fff" />
      <circle cx="46" cy="20" r="2.5" fill="#fff" />
    </svg>
  );
}
