import { fetchFurnitureSection } from '@/shared/api/furniture';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { FurniturePage } from '@/views/furniture/ui/FurniturePage';
import { FurnitureFaqJsonLd } from '@/views/furniture/ui/FurniturePage/FurnitureFaqJsonLd';

export const revalidate = 60;

export default async function FurnitureRoutePage() {
  const initialData = await fetchFurnitureSection(getServerApiBaseUrl());

  return (
    <>
      <FurnitureFaqJsonLd items={initialData?.settings.faq ?? []} />
      <FurniturePage initialData={initialData} />
    </>
  );
}

export async function generateMetadata() {
  const data = await fetchFurnitureSection(getServerApiBaseUrl());
  const settings = data?.settings;
  return {
    title: settings?.seoTitle || settings?.title || 'Мебель',
    description:
      settings?.seoDescription ||
      settings?.description ||
      'Мебель на заказ от производителя: кухни, шкафы-купе, гардеробные, прихожие, детская и мебель для ванной. Бесплатный замер и 3D-проект, изготовление от 14 дней, доставка и сборка, гарантия до 5 лет.',
  };
}
