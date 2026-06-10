import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export type RepairContractQuestionnairesHubIconProps = {
  size?: number;
  className?: string;
};

/** Иконка модалки «Анкеты». */
export function RepairContractQuestionnairesHubIcon({
  size = 18,
  className,
}: RepairContractQuestionnairesHubIconProps) {
  return (
    <ClipboardDocumentListIcon
      className={className}
      aria-hidden
      style={{ width: size, height: size }}
    />
  );
}
