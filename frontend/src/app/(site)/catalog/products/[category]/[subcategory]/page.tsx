import { CatalogPage } from '@/pages/catalog/ui/CatalogPage';

// Маппинг slug подкатегории на человекочитаемое название
const subcategoryNames: Record<string, Record<string, string>> = {
  'entrance-doors': {
    'tt-xl-xxl': 'Входные двери ТТ XL / XXL',
    m: 'Входные двери М',
    argus: 'Входные двери Аргус',
  },
  'interior-doors': {},
  windows: {},
  // Добавлять подкатегории по мере необходимости
};

// Маппинг slug категории на человекочитаемое название
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

  // Получаем названия
  const categoryName = categoryNames[category] || 'Каталог';
  const subcategoryName = subcategoryNames[category]?.[subcategory] || subcategory;

  // Формируем slug для API (category-subcategory формат для БД)
  // Например: entrance-doors + tt-xl-xxl = entrance-doors-tt-xl-xxl
  const categorySlug = `${category}-${subcategory}`;

  return (
    <CatalogPage
      categorySlug={categorySlug}
      categoryName={subcategoryName}
      parentCategoryName={categoryName}
      parentCategorySlug={category}
    />
  );
}

export async function generateMetadata({ params }: SubcategoryPageProps) {
  const { category, subcategory } = await params;
  const categoryName = categoryNames[category] || 'Каталог';
  const subcategoryName = subcategoryNames[category]?.[subcategory] || subcategory;

  return {
    title: `${subcategoryName} | ${categoryName} | Территория интерьерных решений`,
    description: `${subcategoryName} - ${categoryName} - Территория интерьерных решений`,
  };
}
