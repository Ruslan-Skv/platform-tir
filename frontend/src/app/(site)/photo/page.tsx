import { PhotoPage } from '@/views/photo/ui/PhotoPage/PhotoPage';

export default function PhotoListPage() {
  return <PhotoPage />;
}

export function generateMetadata() {
  return {
    title: 'Наши работы | Территория интерьерных решений',
    description:
      'Фотогалерея выполненных проектов: ремонт квартир, санузлов, кухни, гардеробные, двери, окна, натяжные потолки, жалюзи.',
  };
}
