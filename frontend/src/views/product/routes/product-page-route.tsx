import { Metadata } from 'next';

import { apiFetch } from '@/shared/lib/api-fetch';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { ProductDetailPage } from '@/views/product/ui/ProductDetailPage';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const SITE_NAME = 'Территория интерьерных решений';

async function getProduct(slug: string) {
  try {
    const response = await apiFetch(`${getServerApiBaseUrl()}/products/slug/${slug}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export default async function ProductPageRoute({ params }: ProductPageProps) {
  const { slug } = await params;

  return <ProductDetailPage slug={slug} />;
}

export async function generateProductMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: `Товар не найден | ${SITE_NAME}`,
      description: 'Запрашиваемый товар не найден',
    };
  }

  const categoryName = product.category?.name || '';
  const parentCategoryName = product.category?.parent?.name || '';

  const title =
    product.seoTitle || `${product.name}${categoryName ? ` - ${categoryName}` : ''} | ${SITE_NAME}`;

  let description = product.seoDescription;
  if (!description) {
    const categoryPath = parentCategoryName
      ? `${parentCategoryName} > ${categoryName}`
      : categoryName;

    description = `Купить ${product.name}${categoryPath ? ` в категории ${categoryPath}` : ''}. Гарантия качества. ${SITE_NAME}`;

    if (product.description) {
      const shortDesc = product.description.replace(/<[^>]*>/g, '').substring(0, 100);
      description = `${shortDesc}... ${description}`;
    }
  }

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
