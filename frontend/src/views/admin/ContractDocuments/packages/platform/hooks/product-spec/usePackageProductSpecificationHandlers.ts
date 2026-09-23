import { useCallback } from 'react';

import { PACKAGE_SPECIFICATION_VERSIONS_MAX } from '../../form/normalize';
import type { PackageFormData } from '../../form/packageForm';

export type UsePackageProductSpecificationHandlersOptions = {
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
  setError: (message: string | null) => void;
};

export function usePackageProductSpecificationHandlers({
  setForm,
  touchPackageData,
  setError,
}: UsePackageProductSpecificationHandlersOptions) {
  const onProductSpecificationAmountChange = useCallback(
    (value: string) => {
      setForm((p) => ({ ...p, productSpecificationAmount: value }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  /** Новая версия файла спецификации: номер по порядку загрузки, legacy-поля — на последнюю версию. */
  const onProductSpecificationVersionAttached = useCallback(
    (payload: { fileUrl: string; fileName: string; size: number | null }) => {
      setForm((p) => {
        const versions = p.productSpecificationVersions ?? [];
        if (versions.length >= PACKAGE_SPECIFICATION_VERSIONS_MAX) return p;
        const nextVersion = versions.reduce((max, v) => Math.max(max, v.version), 0) + 1;
        const entry = {
          version: nextVersion,
          fileUrl: payload.fileUrl,
          fileName: payload.fileName,
          uploadedAt: new Date().toISOString(),
          size: payload.size,
        };
        return {
          ...p,
          productSpecificationVersions: [...versions, entry],
          productSpecificationFileUrl: entry.fileUrl,
          productSpecificationFileName: entry.fileName,
        };
      });
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  /** Удаление одной версии файла; остальные номера версий сохраняются. */
  const onProductSpecificationVersionRemoved = useCallback(
    (version: number) => {
      setForm((p) => {
        const versions = (p.productSpecificationVersions ?? []).filter(
          (v) => v.version !== version
        );
        const latest = versions[versions.length - 1] ?? null;
        return {
          ...p,
          productSpecificationVersions: versions,
          productSpecificationFileUrl: latest?.fileUrl ?? '',
          productSpecificationFileName: latest?.fileName ?? '',
        };
      });
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const onDoorsSpecificationLinesChange = useCallback(
    (lines: PackageFormData['doorsSpecificationLines']) => {
      setForm((p) => ({ ...p, doorsSpecificationLines: lines }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const onDoorsSpecificationDiscountPercentChange = useCallback(
    (value: string) => {
      setForm((p) => ({ ...p, doorsSpecificationDiscountPercent: value }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const onCeilingsSpecificationChange = useCallback(
    (ceilingsSpecification: PackageFormData['ceilingsSpecification']) => {
      setForm((p) => ({ ...p, ceilingsSpecification }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const onFurnitureManufactureDocsChange = useCallback(
    (manufactureDocs: PackageFormData['furniture']['manufactureDocs']) => {
      setForm((p) => {
        const total = manufactureDocs.specificationLines.reduce((sum, line) => {
          const qty = Number.parseFloat(line.quantity.replace(/\s/g, '').replace(',', '.'));
          const price = Number.parseFloat(line.unitPrice.replace(/\s/g, '').replace(',', '.'));
          if (Number.isFinite(qty) && Number.isFinite(price)) {
            return sum + Math.round(qty * price * 100) / 100;
          }
          return sum;
        }, 0);
        const totalStr = total > 0 ? String(total) : p.furniture.manufacture.contract.totalAmount;
        const recommended =
          total > 0
            ? String(Math.round(total * 0.7 * 100) / 100)
            : p.furniture.manufacture.contract.recommendedPrepayment;
        return {
          ...p,
          furniture: {
            ...p.furniture,
            manufactureDocs,
            manufacture: {
              ...p.furniture.manufacture,
              contract: {
                ...p.furniture.manufacture.contract,
                totalAmount: totalStr,
                recommendedPrepayment: recommended,
              },
            },
          },
          contract: {
            ...p.contract,
            totalAmount: totalStr || p.contract.totalAmount,
            recommendedPrepayment: recommended || p.contract.recommendedPrepayment,
          },
          productSpecificationAmount: totalStr || p.productSpecificationAmount,
        };
      });
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  return {
    onProductSpecificationAmountChange,
    onProductSpecificationVersionAttached,
    onProductSpecificationVersionRemoved,
    onDoorsSpecificationLinesChange,
    onDoorsSpecificationDiscountPercentChange,
    onCeilingsSpecificationChange,
    onFurnitureManufactureDocsChange,
    onError: setError,
  };
}
