import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import {
  packageExecutorProfilesKind,
  packageContractSettingsKind as registryContractSettingsKind,
} from '../platform/catalogKinds';
import { isProductLikePackageKind } from './packageDirectionRegistry';

/** Товарные направления с общим UI пакета (счёт-заказ, спецификация, без акта начала работ). */
export type ProductDirectionPackageKind = Extract<
  ContractDocumentPackageKind,
  'WINDOWS' | 'DOORS' | 'BLINDS' | 'CEILINGS'
>;

/** Направления «Окна», «Двери», «Жалюзи», «Натяжные потолки» — общий UI пакета PRODUCT_LIKE. */
export function isProductDirectionPackageKind(
  kind: ContractDocumentPackageKind | undefined | null
): kind is ProductDirectionPackageKind {
  return isProductLikePackageKind(kind);
}

/** Исполнители и менеджеры для товарных направлений берутся из общего справочника REPAIR. */
export function productDirectionSharedProfilesKind(
  kind: ContractDocumentPackageKind
): ContractDocumentPackageKind {
  return packageExecutorProfilesKind(kind);
}

/** Настройки срока и наценки заказ-наряда — общие для товарных направлений (ключ WINDOWS). */
export function productDirectionContractSettingsKind(
  kind: ContractDocumentPackageKind
): Extract<ContractDocumentPackageKind, 'WINDOWS'> {
  return registryContractSettingsKind(kind) as Extract<ContractDocumentPackageKind, 'WINDOWS'>;
}
