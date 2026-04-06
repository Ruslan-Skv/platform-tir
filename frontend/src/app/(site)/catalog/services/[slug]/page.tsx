import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { ServiceCategoryPage } from '@/views/services/ui/ServiceCategoryPage';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ServiceCategoryRoutePage({ params }: PageProps) {
  const { slug } = await params;
  return <ServiceCategoryPage slug={slug} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  try {
    const res = await fetch(`${getServerApiBaseUrl()}/service-catalog/categories/${slug}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const cat = await res.json();
      return {
        title: `${cat.name} | Ремонт квартир | Территория интерьерных решений`,
        description: cat.description || `Виды работ: ${cat.name}`,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    title: 'Ремонт квартир | Территория интерьерных решений',
  };
}
