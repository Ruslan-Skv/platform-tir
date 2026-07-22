'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { packageUsesLineSpecification } from '../../../config';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import { CeilingsSpecificationTabContent } from '../../../families/product-like/ceilings/CeilingsSpecificationTabContent';
import type { CeilingsSpecification } from '../../../families/product-like/ceilings/ceilingsSpecification';
import { DoorsSpecificationTabContent } from '../../../families/product-like/specification/DoorsSpecificationTabContent';
import { ProductSpecificationTabContent } from '../../../families/product-like/specification/ProductSpecificationTabContent';
import type { DoorsSpecificationLine } from '../../../families/product-like/specification/doorsSpecification';

export type ProductSpecificationTabProps = {
  packageKind: ContractDocumentPackageKind;
  packageId: string;
  contractNumberLabel: string;
  contractDateLabel: string;
  directorName: string;
  customerFullName: string;
  disabled?: boolean;
  productSpecificationAmount: string;
  productSpecificationFileUrl: string;
  productSpecificationFileName: string;
  doorsSpecificationLines: DoorsSpecificationLine[];
  doorsSpecificationDiscountPercent: string;
  ceilingsSpecification: CeilingsSpecification;
  onProductSpecificationAmountChange: (value: string) => void;
  onProductSpecificationFileAttached: (payload: { fileUrl: string; fileName: string }) => void;
  onProductSpecificationFileClear: () => void;
  onDoorsSpecificationLinesChange: (lines: DoorsSpecificationLine[]) => void;
  onDoorsSpecificationDiscountPercentChange: (value: string) => void;
  onCeilingsSpecificationChange: (spec: CeilingsSpecification) => void;
  onError: (message: string) => void;
};

/** Вкладка «Спецификация» для товарных направлений (Окна, Двери, Жалюзи, Потолки…). */
export function ProductSpecificationTab({
  packageKind,
  packageId,
  contractNumberLabel,
  contractDateLabel,
  directorName,
  customerFullName,
  disabled = false,
  productSpecificationAmount,
  productSpecificationFileUrl,
  productSpecificationFileName,
  doorsSpecificationLines,
  doorsSpecificationDiscountPercent,
  ceilingsSpecification,
  onProductSpecificationAmountChange,
  onProductSpecificationFileAttached,
  onProductSpecificationFileClear,
  onDoorsSpecificationLinesChange,
  onDoorsSpecificationDiscountPercentChange,
  onCeilingsSpecificationChange,
  onError,
}: ProductSpecificationTabProps) {
  if (!isProductDirectionPackageKind(packageKind)) {
    return null;
  }

  if (packageKind === 'CEILINGS') {
    return (
      <CeilingsSpecificationTabContent
        spec={ceilingsSpecification}
        contractNumberLabel={contractNumberLabel}
        contractDateLabel={contractDateLabel}
        directorName={directorName}
        customerFullName={customerFullName}
        disabled={disabled}
        onSpecChange={onCeilingsSpecificationChange}
        onError={onError}
      />
    );
  }

  if (packageUsesLineSpecification(packageKind)) {
    return (
      <DoorsSpecificationTabContent
        packageKind={packageKind}
        lines={doorsSpecificationLines}
        contractNumberLabel={contractNumberLabel}
        contractDateLabel={contractDateLabel}
        directorName={directorName}
        customerFullName={customerFullName}
        discountPercent={doorsSpecificationDiscountPercent}
        disabled={disabled}
        onLinesChange={onDoorsSpecificationLinesChange}
        onDiscountPercentChange={onDoorsSpecificationDiscountPercentChange}
      />
    );
  }

  return (
    <ProductSpecificationTabContent
      packageKind={packageKind}
      packageId={packageId}
      amount={productSpecificationAmount}
      fileUrl={productSpecificationFileUrl}
      fileName={productSpecificationFileName}
      contractNumberLabel={contractNumberLabel}
      contractDateLabel={contractDateLabel}
      directorName={directorName}
      customerFullName={customerFullName}
      disabled={disabled}
      onAmountChange={onProductSpecificationAmountChange}
      onFileAttached={onProductSpecificationFileAttached}
      onFileClear={onProductSpecificationFileClear}
      onError={onError}
    />
  );
}
