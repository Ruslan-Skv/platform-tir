import { fetchStretchCeilingsSection } from '@/shared/api/stretch-ceilings';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { StretchCeilingsPage } from '@/views/stretch-ceilings/ui/StretchCeilingsPage';
import { StretchCeilingsFaqJsonLd } from '@/views/stretch-ceilings/ui/StretchCeilingsPage/StretchCeilingsFaqJsonLd';

export const revalidate = 60;

export default async function StretchCeilingsRoutePage() {
  const initialData = await fetchStretchCeilingsSection(getServerApiBaseUrl());

  return (
    <>
      <StretchCeilingsFaqJsonLd items={initialData?.settings.faq ?? []} />
      <StretchCeilingsPage initialData={initialData} />
    </>
  );
}

export async function generateMetadata() {
  const data = await fetchStretchCeilingsSection(getServerApiBaseUrl());
  const settings = data?.settings;
  return {
    title: settings?.seoTitle || settings?.title || 'Натяжные потолки',
    description:
      settings?.seoDescription ||
      settings?.description ||
      'Натяжные потолки под ключ: матовые, глянцевые, сатиновые и тканевые полотна. Калькулятор стоимости, бесплатный замер, монтаж за один день, гарантия до 15 лет.',
  };
}
