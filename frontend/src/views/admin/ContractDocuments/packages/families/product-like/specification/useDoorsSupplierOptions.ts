'use client';

import { useEffect, useState } from 'react';

import { fetchAdminCatalogSuppliersForSelect } from '@/shared/api/admin-component-catalog';
import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

export type DoorsSupplierOption = { id: string; title: string };

/** Справочник «Поставщики» для колонки выбора поставщика позиции (только «Двери»). */
export function useDoorsSupplierOptions(
  packageKind: ContractDocumentPackageKind
): DoorsSupplierOption[] | undefined {
  const [supplierOptions, setSupplierOptions] = useState<DoorsSupplierOption[] | undefined>(
    packageKind === 'DOORS' ? [] : undefined
  );
  useEffect(() => {
    if (packageKind !== 'DOORS') return;
    let cancelled = false;
    fetchAdminCatalogSuppliersForSelect()
      .then((suppliers) => {
        if (cancelled) return;
        setSupplierOptions(
          suppliers.map((s) => ({ id: s.id, title: s.commercialName?.trim() || s.legalName }))
        );
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
