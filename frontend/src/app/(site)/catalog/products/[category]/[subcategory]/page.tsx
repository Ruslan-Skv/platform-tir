import { CatalogPage } from '@/views/catalog/ui/CatalogPage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Маппинг slug родительской категории на человекочитаемое название (fallback, если API недоступен)
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
  params: Promise<{
    category: string;
    subcategory: string;
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

export default async function SubcategoryPage({ params }: SubcategoryPageProps) {
  const { category, subcategory } = await params;

  const parentCategoryName = categoryNames[category] ?? category;
  const categorySlug = subcategory;

  // Название подкатегории из API (на русском), чтобы в хлебных крошках не показывался slug
  const categoryName = await getCategoryNameBySlug(categorySlug);

  return (
    <CatalogPage
      categorySlug={categorySlug}
      categoryName={categoryName ?? parentCategoryName}
      parentCategoryName={parentCategoryName}
      parentCategorySlug={category}
    />
  );
}

export async function generateMetadata({ params }: SubcategoryPageProps) {
  const { category, subcategory } = await params;
  const parentCategoryName = categoryNames[category] ?? category;
  const categoryName = await getCategoryNameBySlug(subcategory);

  const displayName = categoryName ?? subcategory;

  return {
    title: `${displayName} | ${parentCategoryName} | Территория интерьерных решений`,
    description: `${displayName} - ${parentCategoryName} - Территория интерьерных решений`,
  };
}
