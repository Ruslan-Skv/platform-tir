import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

export type RepairContractWorkOrdersHubIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Заказ-наряды и итоговые сметы». */
export function RepairContractWorkOrdersHubIcon({
  size = 18,
  className,
}: RepairContractWorkOrdersHubIconProps) {
  return (
    <WrenchScrewdriverIcon
      className={className}
      aria-hidden
      style={{ width: size, height: size }}
    />
  );
}
