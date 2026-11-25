'use client';

import { useEffect, useState } from 'react';

import {
  type ContractDocumentPackageKind,
  getContractDocumentDoorsSpecificationSuppliers,
} from '@/shared/api/admin-contract-document-packages';

export type DoorsSupplierOption = { id: string; title: string };

/**
 * Поставщики колонки выбора поставщика позиции (только «Двери») — список, который
 * задал супер-админ в «Настройках договоров». Доступен любому сотруднику с доступом
 * к договорам, независимо от доступа к разделу «Поставщики».
 */
export function useDoorsSupplierOptions(
  packageKind: ContractDocumentPackageKind
): DoorsSupplierOption[] | undefined {
  const [supplierOptions, setSupplierOptions] = useState<DoorsSupplierOption[] | undefined>(
    packageKind === 'DOORS' ? [] : undefined
  );
  useEffect(() => {
    if (packageKind !== 'DOORS') return;
    let cancelled = false;
    getContractDocumentDoorsSpecificationSuppliers()
      .then((suppliers) => {
        if (cancelled) return;
        setSupplierOptions(suppliers);
      })
      .catch(() => {
        if (!cancelled) setSupplierOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [packageKind]);
  return supplierOptions;
}
