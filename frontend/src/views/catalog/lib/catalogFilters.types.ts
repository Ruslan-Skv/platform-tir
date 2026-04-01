export interface CatalogFilterOption {
  value: string;
  label: string;
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
}
