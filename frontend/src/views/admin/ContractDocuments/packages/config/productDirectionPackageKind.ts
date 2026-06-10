import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import {
  packageExecutorProfilesKind,
  packageContractSettingsKind as registryContractSettingsKind,
} from '../platform/catalogKinds';
import { isProductLikePackageKind } from './packageDirectionRegistry';

/** @deprecated Используйте {@link isProductLikePackageKind} из `packages/config`. */
export type ProductDirectionPackageKind = Extract<ContractDocumentPackageKind, 'WINDOWS' | 'DOORS'>;

/** Направления «Окна» и «Двери» — общий UI пакета (счёт-заказ, спецификация, без акта начала работ). */
export function isProductDirectionPackageKind(
  kind: ContractDocumentPackageKind | undefined | null
): kind is ProductDirectionPackageKind {
  return isProductLikePackageKind(kind);
}

/** Исполнители и менеджеры для «Окна»/«Двери» берутся из общего справочника REPAIR. */
export function productDirectionSharedProfilesKind(
  kind: ContractDocumentPackageKind
): ContractDocumentPackageKind {
  return packageExecutorProfilesKind(kind);
}

/** Настройки срока и наценки заказ-наряда — общие для «Окна» и «Двери». */
export function productDirectionContractSettingsKind(
  kind: ContractDocumentPackageKind
): Extract<ContractDocumentPackageKind, 'WINDOWS'> {
  return registryContractSettingsKind(kind) as Extract<ContractDocumentPackageKind, 'WINDOWS'>;
}
