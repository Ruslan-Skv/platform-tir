import { fetchStretchCeilingsSection } from '@/shared/api/stretch-ceilings';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { StretchCeilingsPage } from '@/views/stretch-ceilings/ui/StretchCeilingsPage';

export const revalidate = 60;

export default async function StretchCeilingsRoutePage() {
  const initialData = await fetchStretchCeilingsSection(getServerApiBaseUrl());

  // JSON-LD FAQ для расширенного сниппета в поиске
  const faq = initialData?.settings.faq ?? [];
  const faqJsonLd =
    faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        }
      : null;

  return (
    <>
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
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
