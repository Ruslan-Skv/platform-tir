import { useCallback } from 'react';

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

  const onProductSpecificationFileAttached = useCallback(
    ({ fileUrl, fileName }: { fileUrl: string; fileName: string }) => {
      setForm((p) => ({
        ...p,
        productSpecificationFileUrl: fileUrl,
        productSpecificationFileName: fileName,
      }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const onProductSpecificationFileClear = useCallback(() => {
    setForm((p) => ({
      ...p,
      productSpecificationFileUrl: '',
      productSpecificationFileName: '',
    }));
    touchPackageData();
  }, [setForm, touchPackageData]);

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
    onProductSpecificationFileAttached,
    onProductSpecificationFileClear,
    onDoorsSpecificationLinesChange,
    onDoorsSpecificationDiscountPercentChange,
    onCeilingsSpecificationChange,
    onFurnitureManufactureDocsChange,
    onError: setError,
  };
}
