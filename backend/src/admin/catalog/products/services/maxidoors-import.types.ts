import type { MaxidoorsAttrRule, MaxidoorsCatalogKey } from './maxidoors-catalogs';

export type MaxidoorsImportJobStatus = 'pending' | 'running' | 'done' | 'error';

export type MaxidoorsImportItemRef = {
  name: string;
  url: string;
  productId?: string;
  supplierSku?: string | null;
};

export type MaxidoorsImportJob = {
  id: string;
  catalog: MaxidoorsCatalogKey;
  status: MaxidoorsImportJobStatus;
  categoryId: string;
  supplierId: string | null;
  total: number;
  done: number;
  created: number;
  skipped: number;
  errors: string[];
  /** Новые товары, созданные в этом запуске */
  createdItems: MaxidoorsImportItemRef[];
  /** Ранее импортированные, которых больше нет в листинге поставщика */
  missingItems: MaxidoorsImportItemRef[];
  startedAt: string;
  finishedAt?: string;
  message?: string;
};

export type StartMaxidoorsImportOptions = {
  catalog: MaxidoorsCatalogKey | string;
  categoryId?: string;
  supplierId?: string;
  limit?: number;
  delayMs?: number;
  skipExisting?: boolean;
};

export type ResolvedAttrSlot = {
  rule: MaxidoorsAttrRule;
  slug: string;
  isFk: boolean;
};

export function normalizeSupplierProductUrl(url: string): string {
  return url.trim().split('#')[0].replace(/\/?$/, '/').toLowerCase();
}
