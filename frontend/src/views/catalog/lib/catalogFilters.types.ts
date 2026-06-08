export interface CatalogFilterOption {
  value: string;
  label: string;
  /** Товаров с этим значением в текущей ветке каталога (как на бэкенде) */
  count?: number;
}

export interface CatalogFilterFacet {
  id: string;
  label: string;
  type: 'checkbox' | 'radio';
  options: CatalogFilterOption[];
  attributeSlug?: string;
  attributeName?: string | null;
}

export interface CatalogFiltersResponse {
  branch: string | null;
  filters: CatalogFilterFacet[];
  categoryFilterOptions?: Array<{
    slug: string;
    label: string;
    count: number;
    depth?: 0 | 1;
  }>;
}
