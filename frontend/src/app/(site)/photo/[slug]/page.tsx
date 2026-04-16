import { fetchPhotoGalleryInitialData } from '@/shared/api/photo';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { PhotoPage } from '@/views/photo/ui/PhotoPage/PhotoPage';

interface PhotoCategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PhotoCategoryPage({ params }: PhotoCategoryPageProps) {
  const { slug } = await params;
  const initialData = await fetchPhotoGalleryInitialData(getServerApiBaseUrl(), {
    categorySlugs: [slug],
  });
  return <PhotoPage initialCategorySlug={slug} initialData={initialData} />;
}
