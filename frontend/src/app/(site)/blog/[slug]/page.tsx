import { Metadata } from 'next';

import { BlogPostPage } from '@/pages/blog/ui/BlogPostPage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const SITE_NAME = 'Территория интерьерных решений';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

async function getBlogPost(slug: string) {
  try {
    const response = await fetch(`${API_URL}/blog/posts/slug/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export default async function BlogPostRoute({ params }: BlogPostPageProps) {
  const { slug } = await params;

  return <BlogPostPage slug={slug} />;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: `Запись не найдена | ${SITE_NAME}`,
      description: 'Запрашиваемая запись не найдена',
    };
  }

  const title = post.seoTitle || `${post.title} | ${SITE_NAME}`;
  const description =
    post.seoDescription || post.excerpt || post.content?.replace(/<[^>]*>/g, '').slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt,
      images: post.featuredImage ? [{ url: post.featuredImage, alt: post.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.featuredImage ? [post.featuredImage] : undefined,
    },
  };
}
