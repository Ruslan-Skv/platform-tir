import { PhotoPage } from '@/pages/photo/ui/PhotoPage/PhotoPage';

export default function PhotoListPage() {
  return <PhotoPage />;
}

export function generateMetadata() {
  return {
    title: 'Фото наших работ | Территория интерьерных решений',
    description:
      'Фотогалерея выполненных проектов: ремонт квартир, санузлов, кухни, гардеробные, двери, окна, натяжные потолки, жалюзи.',
  };
}
