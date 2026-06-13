import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { resolveCatalogCategoryName } from '@/views/catalog/lib/catalog-category-names';
import { parseNextSearchParamsRecord } from '@/views/catalog/lib/catalog-search-params';
import { buildCatalogMetadata } from '@/views/catalog/lib/catalog-seo';
import { getCatalogHubCategoriesCached } from '@/views/catalog/lib/fetch-catalog-hub-categories';
import { getCatalogPageCached } from '@/views/catalog/lib/get-catalog-page-cached';
import { isCacheableCatalogRequest } from '@/views/catalog/lib/is-cacheable-catalog-request';
import {
  loadCatalogRoutePage,
  searchParamsRecordToQueryString,
} from '@/views/catalog/lib/load-catalog-route-page';
import { CatalogPageShell } from '@/views/catalog/ui/CatalogPageShell';

const API_URL = getServerApiBaseUrl();

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CategoryPageRoute({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const sp = await searchParams;
  const parsed = parseNextSearchParamsRecord(sp);
  const categoryName = await resolveCatalogCategoryName(category);
  const pathname = `/catalog/products/${category}`;
  const searchQueryString = searchParamsRecordToQueryString(sp);

  const [route, initialHubCategories] = await Promise.all([
    loadCatalogRoutePage({
      categorySlug: category,
      parsed,
      pathname,
      searchQueryString,
    }),
    getCatalogHubCategoriesCached(),
  ]);

  return (
    <CatalogPageShell
      categorySlug={category}
      categoryName={categoryName}
      initialPage={route.initialPage}
      initialHubCategories={initialHubCategories}
      listUrl={route.listUrl}
      pagination={route.pagination}
      showSeoProductGrid={isCacheableCatalogRequest(parsed)}
    />
  );
}

export async function generateCategoryMetadata({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const sp = await searchParams;
  const parsed = parseNextSearchParamsRecord(sp);
  const categoryName = await resolveCatalogCategoryName(category);

  const catalogPage = await getCatalogPageCached({
    categorySlug: category,
    parsed,
    limit: 15,
    apiBaseUrl: API_URL,
  });

  return buildCatalogMetadata({
    title: `${categoryName} | Территория интерьерных решений`,
    description: `${categoryName} — каталог товаров. Территория интерьерных решений`,
    pathname: `/catalog/products/${category}`,
    parsed,
    totalPages: catalogPage.totalPages,
    searchQueryString: searchParamsRecordToQueryString(sp),
  });
}
