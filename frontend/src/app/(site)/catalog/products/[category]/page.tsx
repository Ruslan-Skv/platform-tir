import { CatalogPage } from '@/views/catalog/ui/CatalogPage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Маппинг slug на название (fallback, если API недоступен)
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
  params: Promise<{
    category: string;
  }>;
}

async function getCategoryNameBySlug(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/categories/slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.name ?? null;
  } catch {
    return null;
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const categoryName =
    categoryNames[category] ?? (await getCategoryNameBySlug(category)) ?? 'Каталог';

  return <CatalogPage categorySlug={category} categoryName={categoryName} />;
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { category } = await params;
  const categoryName =
    categoryNames[category] ?? (await getCategoryNameBySlug(category)) ?? 'Каталог';

  return {
    title: `${categoryName} | Территория интерьерных решений`,
    description: `${categoryName} - Территория интерьерных решений`,
  };
}
