import { PhotoPage } from '@/pages/photo/ui/PhotoPage/PhotoPage';

interface PhotoCategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PhotoCategoryPage({ params }: PhotoCategoryPageProps) {
  const { slug } = await params;
  return <PhotoPage initialCategorySlug={slug} />;
}
