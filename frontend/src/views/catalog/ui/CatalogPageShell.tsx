import type { CatalogHubPreviewResponse } from '@/shared/api/catalog-hub-preview';
import type { PublicCatalogPageResponse } from '@/shared/api/public-catalog-list';
import type { CategoryFilterOption } from '@/views/catalog/lib/buildCategoryFilterOptions';
import type { CatalogPaginationLinksInput } from '@/views/catalog/lib/catalog-seo';
import { CatalogPage, type CatalogPageProps } from '@/views/catalog/ui/CatalogPage';
import { CatalogPaginationLinks } from '@/views/catalog/ui/CatalogPaginationLinks';
import { CatalogServerProductGrid } from '@/views/catalog/ui/CatalogServerProductGrid';

interface CatalogPageShellProps extends Omit<
  CatalogPageProps,
  'initialPage' | 'initialList' | 'initialFilters'
> {
  initialPage: PublicCatalogPageResponse | null;
  initialHubCategories?: CategoryFilterOption[] | null;
  initialHubPreview?: CatalogHubPreviewResponse | null;
  pagination?: CatalogPaginationLinksInput | null;
  /** SSR-сетка только для индексируемых URL без фильтров/сортировки в query */
  showSeoProductGrid?: boolean;
}

/**
 * SSR-оболочка каталога: prev/next, SEO-ссылки на товары, клиентская страница.
 */
export function CatalogPageShell({
  initialPage,
  initialHubCategories = null,
  initialHubPreview = null,
  pagination,
  listUrl,
  showSeoProductGrid = false,
  ...catalogPageProps
}: CatalogPageShellProps) {
  return (
    <>
      {pagination ? <CatalogPaginationLinks {...pagination} /> : null}
      {showSeoProductGrid && initialPage?.products.length ? (
        <CatalogServerProductGrid products={initialPage.products} />
      ) : null}
      <CatalogPage
        {...catalogPageProps}
        initialPage={initialPage}
        initialHubCategories={initialHubCategories}
        initialHubPreview={initialHubPreview}
        listUrl={listUrl}
      />
    </>
  );
}
