import { fetchServiceCatalog } from '@/shared/api/service-catalog';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { ServiceCatalogPage } from '@/views/services/ui/ServiceCatalogPage';

export const revalidate = 60;

export default async function ServicesListPage() {
  const initialData = await fetchServiceCatalog(getServerApiBaseUrl());
  return <ServiceCatalogPage initialData={initialData} />;
}

export async function generateMetadata() {
  const data = await fetchServiceCatalog(getServerApiBaseUrl());
  const block = data?.block;
  return {
    title: block?.seoTitle || block?.title || 'Ремонт квартир | Территория интерьерных решений',
    description:
      block?.seoDescription ||
      'Каталог видов работ с ценами: малярные работы, сантехника, полы, кафель, электромонтаж и другие услуги по ремонту.',
  };
}
