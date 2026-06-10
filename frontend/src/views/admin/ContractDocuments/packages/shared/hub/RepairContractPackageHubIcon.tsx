import Image from 'next/image';

export const REPAIR_CONTRACT_PACKAGE_HUB_ICON_SRC = '/icons/repair-contract-package-hub.png';

export type RepairContractPackageHubIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Оплаты и управление договором» (список договоров, шапка редактора). */
export function RepairContractPackageHubIcon({
  size = 18,
  className,
}: RepairContractPackageHubIconProps) {
  return (
    <Image
      src={REPAIR_CONTRACT_PACKAGE_HUB_ICON_SRC}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden
      unoptimized
    />
  );
}
