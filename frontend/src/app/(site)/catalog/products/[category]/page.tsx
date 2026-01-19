import { CatalogPage } from '@/pages/catalog/ui/CatalogPage';

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

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const categoryName = categoryNames[category] || 'Каталог';

  return <CatalogPage categorySlug={category} categoryName={categoryName} />;
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { category } = await params;
  const categoryName = categoryNames[category] || 'Каталог';

  return {
    title: `${categoryName} | Территория интерьерных решений`,
    description: `${categoryName} - Территория интерьерных решений`,
  };
}
