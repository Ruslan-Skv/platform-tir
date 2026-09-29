import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { isFurnitureLikePackageKind } from '../../../config';
import type { PackageCustomerBlock } from '../../form/packageForm';
import { packageCustomerBlockHasContent } from '../../questionnaires/applyCrmContractToForm';

export type ContractSignRequirementsInput = {
  packageKind: ContractDocumentPackageKind;
  /**
   * Блок «Заказчик» на вкладке «Данные»: заполнен — заказчик прикреплён к договору
   * (из него заполняются плейсхолдеры шаблонов пакета).
   */
  customer: PackageCustomerBlock;
  contractNumber: string;
  contractDate: string;
  objectAddress: string;
  /** Выбранный набор реквизитов исполнителя («Исполнители (из справочника)»). */
  executorProfileTitle: string;
  /** Выбранная карточка менеджера («Карточка менеджера (из справочника)»). */
  signatoryProfileTitle: string;
};

/**
 * Что должно быть заполнено на вкладке «Данные» до подписания договора.
 * «Мебель» не трогаем: у неё свои номера по ногам договора и пока сырые шаблоны —
 * там проверяется только блок «Заказчик».
 */
export function collectContractSignRequirements(input: ContractSignRequirementsInput): string[] {
  const missing: string[] = [];
  if (!packageCustomerBlockHasContent(input.customer)) {
    missing.push('данные заказчика — блок «Заказчик»');
  }
  if (!isFurnitureLikePackageKind(input.packageKind)) {
    if (!input.executorProfileTitle.trim()) {
      missing.push('карточка исполнителя (справочник «Исполнители»)');
    }
    if (!input.signatoryProfileTitle.trim()) {
      missing.push('карточка менеджера (справочник «Карточка менеджера»)');
    }
    if (!input.contractNumber.trim()) {
      missing.push('номер договора («Номер дог.»)');
    }
    if (!input.contractDate.trim()) {
      missing.push('дата заключения («Дата закл.»)');
    }
    if (!input.objectAddress.trim()) {
      missing.push('адрес объекта');
    }
  }
  return missing;
}
