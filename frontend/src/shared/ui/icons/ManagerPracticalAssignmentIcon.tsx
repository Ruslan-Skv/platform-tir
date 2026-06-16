export const MANAGER_PRACTICAL_ASSIGNMENT_ICON_SIZE = 48;

export type ManagerPracticalAssignmentIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Практическое задание» — часы с галочкой (выполнение в срок) */
export function ManagerPracticalAssignmentIcon({
  size = MANAGER_PRACTICAL_ASSIGNMENT_ICON_SIZE,
  className,
}: ManagerPracticalAssignmentIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
    >
      <circle cx="24" cy="24" r="24" fill="#76D7A8" />
      <path d="M24 6V10" stroke="#1B2A4A" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 24H38" stroke="#1B2A4A" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 42V38" stroke="#1B2A4A" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 24H10" stroke="#1B2A4A" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M16 14L24 24L40 10"
        fill="none"
        stroke="#1B2A4A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
