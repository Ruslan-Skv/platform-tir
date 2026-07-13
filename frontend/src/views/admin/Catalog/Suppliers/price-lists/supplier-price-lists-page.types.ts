import type { RefObject } from 'react';

import type {
  PriceListCompareResponse,
  PriceListDiffRow,
  PriceListDiffStatus,
  SupplierPriceListCategory,
  SupplierPriceListSnapshot,
} from '@/shared/api/admin-supplier-price-lists';

export type PriceListPageMessage = {
  type: 'ok' | 'err';
  text: string;
};

export type SupplierInfo = {
  id: string;
  legalName: string;
  commercialName?: string | null;
};

export type SupplierPriceListsPageModel = {
  supplierId: string;
  category: SupplierPriceListCategory;
  supplierLabel: string;
  isTrimCategory: boolean;
  snapshots: SupplierPriceListSnapshot[];
  comparison: PriceListCompareResponse | null;
  filteredRows: PriceListDiffRow[];
  loading: boolean;
  uploading: boolean;
  comparing: boolean;
  mapping: boolean;
  applying: boolean;
  selectedFile: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  currentSnapshotId: string;
  previousSnapshotId: string;
  statusFilter: PriceListDiffStatus | 'all';
  message: PriceListPageMessage | null;
  setCategory: (category: SupplierPriceListCategory) => void;
  setSelectedFile: (file: File | null) => void;
  setCurrentSnapshotId: (id: string) => void;
  setPreviousSnapshotId: (id: string) => void;
  setStatusFilter: (filter: PriceListDiffStatus | 'all') => void;
  clearSelectedFile: () => void;
  handleUpload: () => Promise<void>;
  handleAutoMap: () => Promise<void>;
  handleApply: () => Promise<void>;
  runCompare: (currentId: string, previousId?: string) => Promise<void>;
};
