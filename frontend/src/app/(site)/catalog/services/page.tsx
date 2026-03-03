import { ServiceCatalogPage } from '@/views/services/ui/ServiceCatalogPage';

export default function ServicesListPage() {
  return <ServiceCatalogPage />;
}

export function generateMetadata() {
  return {
    title: 'Каталог услуг | Территория интерьерных решений',
    description:
      'Каталог видов работ с ценами: малярные работы, сантехника, полы, кафель, электромонтаж и другие услуги по ремонту.',
  };
}
