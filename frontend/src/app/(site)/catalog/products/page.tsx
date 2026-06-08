import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { parseNextSearchParamsRecord } from '@/views/catalog/lib/catalog-search-params';
import { buildCatalogMetadata } from '@/views/catalog/lib/catalog-seo';
import { getCatalogHubCategoriesCached } from '@/views/catalog/lib/fetch-catalog-hub-categories';
import { getCatalogHubPreviewCached } from '@/views/catalog/lib/fetch-catalog-hub-preview';
import { getCatalogPageCached } from '@/views/catalog/lib/get-catalog-page-cached';
import { isCacheableCatalogRequest } from '@/views/catalog/lib/is-cacheable-catalog-request';
import {
  loadCatalogRoutePage,
  searchParamsRecordToQueryString,
} from '@/views/catalog/lib/load-catalog-route-page';
import { CatalogPageShell } from '@/views/catalog/ui/CatalogPageShell';

interface AllProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AllProductsPage({ searchParams }: AllProductsPageProps) {
  const sp = await searchParams;
  const parsed = parseNextSearchParamsRecord(sp);
  const pathname = '/catalog/products';
  const searchQueryString = searchParamsRecordToQueryString(sp);

  if (!parsed.branch) {
    const [initialHubCategories, initialHubPreview] = await Promise.all([
      getCatalogHubCategoriesCached(),
      getCatalogHubPreviewCached('featured'),
    ]);
    return (
      <CatalogPageShell
        categorySlug="all"
        categoryName="Каталог"
        initialPage={null}
        initialHubCategories={initialHubCategories}
        initialHubPreview={initialHubPreview}
        pagination={null}
      />
    );
  }

  const route = await loadCatalogRoutePage({
    categorySlug: 'all',
    parsed,
    pathname,
    searchQueryString,
  });

  return (
    <CatalogPageShell
      categorySlug="all"
      categoryName="Каталог"
      initialPage={route.initialPage}
      listUrl={route.listUrl}
      pagination={route.pagination}
      showSeoProductGrid={isCacheableCatalogRequest(parsed)}
    />
  );
}

export async function generateMetadata({ searchParams }: AllProductsPageProps) {
  const sp = await searchParams;
  const parsed = parseNextSearchParamsRecord(sp);
  const apiBase = getServerApiBaseUrl();

  let totalPages: number | undefined;
  if (parsed.branch) {
    const catalogPage = await getCatalogPageCached({
      categorySlug: 'all',
      parsed,
      limit: 15,
      apiBaseUrl: apiBase,
    });
    totalPages = catalogPage.totalPages;
  }

  return buildCatalogMetadata({
    title: 'Каталог | Территория интерьерных решений',
    description: 'Каталог товаров — Территория интерьерных решений',
    pathname: '/catalog/products',
    parsed,
    totalPages,
    searchQueryString: searchParamsRecordToQueryString(sp),
  });
}
