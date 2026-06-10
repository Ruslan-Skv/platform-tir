import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export type PackageQuestionnairesHubIconProps = {
  size?: number;
  className?: string;
};

/** Иконка модалки «Анкеты». */
export function PackageQuestionnairesHubIcon({
  size = 18,
  className,
}: PackageQuestionnairesHubIconProps) {
  return (
    <ClipboardDocumentListIcon
      className={className}
      aria-hidden
      style={{ width: size, height: size }}
    />
  );
}
