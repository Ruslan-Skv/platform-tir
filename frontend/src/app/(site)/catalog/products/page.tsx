import { CatalogPage } from '@/pages/catalog/ui/CatalogPage';

export default function AllProductsPage() {
  return <CatalogPage categorySlug="all" categoryName="Каталог товаров" />;
}

export function generateMetadata() {
  return {
    title: 'Каталог товаров | Территория интерьерных решений',
    description: 'Все товары - Территория интерьерных решений',
  };
}
