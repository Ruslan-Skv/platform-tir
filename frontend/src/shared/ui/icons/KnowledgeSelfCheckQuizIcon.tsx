export const KNOWLEDGE_SELF_CHECK_QUIZ_ICON_SIZE = 48;

export type KnowledgeSelfCheckQuizIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Тестовые вопросы» — карточки с вопросительным знаком */
export function KnowledgeSelfCheckQuizIcon({
  size = KNOWLEDGE_SELF_CHECK_QUIZ_ICON_SIZE,
  className,
}: KnowledgeSelfCheckQuizIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
    >
      <rect
        x="10"
        y="8"
        width="52"
        height="72"
        rx="8"
        fill="#FFF9EE"
        stroke="#1B2A4A"
        strokeWidth="3"
      />
      <path d="M18 18H34" stroke="#1B2A4A" strokeWidth="2.5" strokeLinecap="round" />
      <rect
        x="34"
        y="20"
        width="52"
        height="72"
        rx="8"
        fill="#FFF9EE"
        stroke="#1B2A4A"
        strokeWidth="3"
      />
      <path d="M42 30H58" stroke="#1B2A4A" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M74 30V52"
        stroke="#1B2A4A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 4"
      />
      <path
        d="M58 30H74"
        stroke="#1B2A4A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 4"
      />
      <text
        x="60"
        y="68"
        textAnchor="middle"
        fill="#E88B8B"
        fontSize="34"
        fontWeight="700"
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        ?
      </text>
    </svg>
  );
}
