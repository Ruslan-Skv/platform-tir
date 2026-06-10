'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { isProductDirectionPackageKind } from '../../config/productDirectionPackageKind';
import { ProductSpecificationTabContent } from '../../families/product-like/specification/ProductSpecificationTabContent';

export type ProductSpecificationTabProps = {
  packageKind: ContractDocumentPackageKind;
  packageId: string;
  contractNumberLabel: string;
  contractDateLabel: string;
  disabled?: boolean;
  productSpecificationAmount: string;
  productSpecificationFileUrl: string;
  productSpecificationFileName: string;
  onProductSpecificationAmountChange: (value: string) => void;
  onProductSpecificationFileAttached: (payload: { fileUrl: string; fileName: string }) => void;
  onProductSpecificationFileClear: () => void;
  onError: (message: string) => void;
};

/** Вкладка «Спецификация» для товарных направлений (Окна, Двери, …). */
export function ProductSpecificationTab({
  packageKind,
  packageId,
  contractNumberLabel,
  contractDateLabel,
  disabled = false,
  productSpecificationAmount,
  productSpecificationFileUrl,
  productSpecificationFileName,
  onProductSpecificationAmountChange,
  onProductSpecificationFileAttached,
  onProductSpecificationFileClear,
  onError,
}: ProductSpecificationTabProps) {
  if (!isProductDirectionPackageKind(packageKind)) {
    return null;
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
      disabled={disabled}
      onAmountChange={onProductSpecificationAmountChange}
      onFileAttached={onProductSpecificationFileAttached}
      onFileClear={onProductSpecificationFileClear}
      onError={onError}
    />
  );
}
