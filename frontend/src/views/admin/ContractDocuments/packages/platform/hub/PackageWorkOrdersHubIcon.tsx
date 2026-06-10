import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

export type PackageWorkOrdersHubIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Заказ-наряды и итоговые сметы». */
export function PackageWorkOrdersHubIcon({ size = 18, className }: PackageWorkOrdersHubIconProps) {
  return (
    <WrenchScrewdriverIcon
      className={className}
      aria-hidden
      style={{ width: size, height: size }}
    />
  );
}
