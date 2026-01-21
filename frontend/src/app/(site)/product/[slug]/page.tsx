import { Metadata } from 'next';

import { ProductDetailPage } from '@/pages/product/ui/ProductDetailPage';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const SITE_NAME = 'Территория интерьерных решений';

// Функция загрузки товара для метаданных
async function getProduct(slug: string) {
  try {
    const response = await fetch(`${API_URL}/products/slug/${slug}`, {
      next: { revalidate: 60 }, // Кэширование на 60 секунд
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  return <ProductDetailPage slug={slug} />;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: `Товар не найден | ${SITE_NAME}`,
      description: 'Запрашиваемый товар не найден',
    };
  }

  // Используем SEO-поля если они заполнены, иначе генерируем автоматически
  const categoryName = product.category?.name || '';
  const parentCategoryName = product.category?.parent?.name || '';

  // Формируем заголовок: SEO-заголовок или "Название товара - Категория | Сайт"
  const title =
    product.seoTitle || `${product.name}${categoryName ? ` - ${categoryName}` : ''} | ${SITE_NAME}`;

  // Формируем описание: SEO-описание или автоматически из данных товара
  let description = product.seoDescription;
  if (!description) {
    const categoryPath = parentCategoryName
      ? `${parentCategoryName} > ${categoryName}`
      : categoryName;

    description = `Купить ${product.name}${categoryPath ? ` в категории ${categoryPath}` : ''}. Гарантия качества. ${SITE_NAME}`;

    // Добавляем часть описания если есть
    if (product.description) {
      const shortDesc = product.description.replace(/<[^>]*>/g, '').substring(0, 100);
      description = `${shortDesc}... ${description}`;
    }
  }

  // Формируем Open Graph изображение
  const ogImage = product.images?.[0] || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: ogImage ? [{ url: ogImage, alt: product.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}
