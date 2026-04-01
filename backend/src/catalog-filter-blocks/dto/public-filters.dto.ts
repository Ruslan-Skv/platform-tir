/** Ответ публичного API фильтров каталога (GET .../category/:slug/filters) */
export interface CatalogFilterOptionDto {
  value: string;
  label: string;
}

export interface CatalogFilterFacetDto {
  id: string;
  label: string;
  type: 'checkbox' | 'radio';
  options: CatalogFilterOptionDto[];
  attributeSlug?: string;
  attributeName?: string | null;
}

export interface CatalogFiltersResponseDto {
  /** id блока в БД или null, если конфигурации нет */
  branch: string | null;
  filters: CatalogFilterFacetDto[];
}
