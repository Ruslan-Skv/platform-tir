import { apiFetch } from '@/shared/lib/api-fetch';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { parseNextSearchParamsRecord } from '@/views/catalog/lib/catalog-search-params';
import { buildCatalogMetadata } from '@/views/catalog/lib/catalog-seo';
import { getCatalogPageCached } from '@/views/catalog/lib/get-catalog-page-cached';
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

interface CategoryPageProps {
  params: Promise<{ category: string }>;
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

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const sp = await searchParams;
  const parsed = parseNextSearchParamsRecord(sp);
  const categoryName =
    categoryNames[category] ?? (await getCategoryNameBySlug(category)) ?? 'Каталог';
  const pathname = `/catalog/products/${category}`;
  const searchQueryString = searchParamsRecordToQueryString(sp);

  const route = await loadCatalogRoutePage({
    categorySlug: category,
    parsed,
    pathname,
    searchQueryString,
  });

  return (
    <CatalogPageShell
      categorySlug={category}
      categoryName={categoryName}
      initialPage={route.initialPage}
      listUrl={route.listUrl}
      pagination={route.pagination}
    />
  );
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const sp = await searchParams;
  const parsed = parseNextSearchParamsRecord(sp);
  const categoryName =
    categoryNames[category] ?? (await getCategoryNameBySlug(category)) ?? 'Каталог';

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
