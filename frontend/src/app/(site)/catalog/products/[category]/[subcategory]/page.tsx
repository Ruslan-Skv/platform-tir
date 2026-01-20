import { CatalogPage } from '@/pages/catalog/ui/CatalogPage';

// Маппинг slug категории на человекочитаемое название (fallback)
const categoryNames: Record<string, string> = {
  'entrance-doors': 'Двери входные',
  'interior-doors': 'Двери межкомнатные',
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
  params: Promise<{
    category: string;
    subcategory: string;
  }>;
}

export default async function SubcategoryPage({ params }: SubcategoryPageProps) {
  const { category, subcategory } = await params;

  // Получаем название родительской категории
  const parentCategoryName = categoryNames[category] || category;

  // Slug подкатегории передаётся напрямую - он уже является полным slug из БД
  // Например: /catalog/products/entrance-doors/entrance-doors-argus
  // subcategory = "entrance-doors-argus" (полный slug из БД)
  const categorySlug = subcategory;

  return (
    <CatalogPage
      categorySlug={categorySlug}
      categoryName={null} // Будет загружено из API по slug
      parentCategoryName={parentCategoryName}
      parentCategorySlug={category}
    />
  );
}

export async function generateMetadata({ params }: SubcategoryPageProps) {
  const { category, subcategory } = await params;
  const parentCategoryName = categoryNames[category] || category;

  return {
    title: `${subcategory} | ${parentCategoryName} | Территория интерьерных решений`,
    description: `${subcategory} - ${parentCategoryName} - Территория интерьерных решений`,
  };
}
