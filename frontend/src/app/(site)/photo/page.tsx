import { fetchPhotoGalleryInitialData } from '@/shared/api/photo';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { PhotoPage } from '@/views/photo/ui/PhotoPage/PhotoPage';

export default async function PhotoListPage() {
  const initialData = await fetchPhotoGalleryInitialData(getServerApiBaseUrl());
  return <PhotoPage initialData={initialData} />;
}

export function generateMetadata() {
  return {
    title: 'Наши работы | Территория интерьерных решений',
    description:
      'Фотогалерея выполненных проектов: ремонт квартир, санузлов, кухни, гардеробные, двери, окна, натяжные потолки, жалюзи.',
  };
}
