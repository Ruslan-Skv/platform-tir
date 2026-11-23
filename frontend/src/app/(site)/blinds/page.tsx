import { fetchBlindsSection } from '@/shared/api/blinds';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { BlindsPage } from '@/views/blinds/ui/BlindsPage';
import { BlindsFaqJsonLd } from '@/views/blinds/ui/BlindsPage/BlindsFaqJsonLd';

export const revalidate = 60;

export default async function BlindsRoutePage() {
  const initialData = await fetchBlindsSection(getServerApiBaseUrl());

  return (
    <>
      <BlindsFaqJsonLd items={initialData?.settings.faq ?? []} />
      <BlindsPage initialData={initialData} />
    </>
  );
}

export async function generateMetadata() {
  const data = await fetchBlindsSection(getServerApiBaseUrl());
  const settings = data?.settings;
  return {
    title: settings?.seoTitle || settings?.title || 'Жалюзи',
    description:
      settings?.seoDescription ||
      settings?.description ||
      'Жалюзи и рулонные шторы на заказ: рулонные, зебра день-ночь, вертикальные, горизонтальные, плиссе. Калькулятор стоимости, бесплатный замер с каталогами, изготовление от 2 дней, монтаж за один визит, гарантия до 3 лет.',
  };
}
