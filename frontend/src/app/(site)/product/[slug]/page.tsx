import { ProductDetailPage } from '@/pages/product/ui/ProductDetailPage';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  return <ProductDetailPage slug={slug} />;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug: _slug } = await params;

  // В будущем можно загружать данные товара для SEO
  return {
    title: `Товар | Территория интерьерных решений`,
    description: `Детальная информация о товаре - Территория интерьерных решений`,
  };
}
