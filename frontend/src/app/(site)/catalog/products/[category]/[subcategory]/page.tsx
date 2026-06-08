import { apiFetch } from '@/shared/lib/api-fetch';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
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

const categoryNames: Record<string, string> = {
  'entrance-doors': 'Входные двери',
  'interior-doors': 'Межкомнатные двери',
  'door-hardware': 'Фурнитура для дверей',
  windows: 'Окна',
  blinds: 'Жалюзи',
  'stretch-ceilings': 'Потолки натяжные',
  'upholstered-furniture': 'Мягкая мебель',
  'dining-groups': 'Обеденные группы',
  'sleep-products': 'Товары для сна',
  'custom-furniture': 'Мебель по индивидуальным размерам',
  lighting: 'Освещение',
};

interface SubcategoryPageProps {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function getCategoryNameBySlug(slug: string): Promise<string | null> {
  try {
    const res = await apiFetch(`${API_URL}/categories/slug/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.name ?? null;
  } catch {
    return null;
  }
}

export default async function SubcategoryPage({ params, searchParams }: SubcategoryPageProps) {
  const { category, subcategory } = await params;
  const sp = await searchParams;
  const parsed = parseNextSearchParamsRecord(sp);

  const parentCategoryName =
    categoryNames[category] ?? (await getCategoryNameBySlug(category)) ?? category;
  const categorySlug = subcategory;
  const categoryName = await getCategoryNameBySlug(categorySlug);
  const pathname = `/catalog/products/${category}/${subcategory}`;
  const searchQueryString = searchParamsRecordToQueryString(sp);

  const [route, initialHubCategories] = await Promise.all([
    loadCatalogRoutePage({
      categorySlug,
      parsed,
      pathname,
      searchQueryString,
    }),
    getCatalogHubCategoriesCached(),
  ]);

  return (
    <CatalogPageShell
      categorySlug={categorySlug}
      categoryName={categoryName ?? parentCategoryName}
      parentCategoryName={parentCategoryName}
      parentCategorySlug={category}
      initialPage={route.initialPage}
      initialHubCategories={initialHubCategories}
      listUrl={route.listUrl}
      pagination={route.pagination}
      showSeoProductGrid={isCacheableCatalogRequest(parsed)}
    />
  );
}

export async function generateMetadata({ params, searchParams }: SubcategoryPageProps) {
  const { category, subcategory } = await params;
  const sp = await searchParams;
  const parsed = parseNextSearchParamsRecord(sp);
  const parentCategoryName =
    categoryNames[category] ?? (await getCategoryNameBySlug(category)) ?? category;
  const categoryName = await getCategoryNameBySlug(subcategory);
  const displayName = categoryName ?? subcategory;

  const catalogPage = await getCatalogPageCached({
    categorySlug: subcategory,
    parsed,
    limit: 15,
    apiBaseUrl: API_URL,
  });

  return buildCatalogMetadata({
    title: `${displayName} | ${parentCategoryName} | Территория интерьерных решений`,
    description: `${displayName} — ${parentCategoryName}. Территория интерьерных решений`,
    pathname: `/catalog/products/${category}/${subcategory}`,
    parsed,
    totalPages: catalogPage.totalPages,
    searchQueryString: searchParamsRecordToQueryString(sp),
  });
}
