import type { BlindsFaqItem } from '@/shared/api/blinds';
import { safeJsonLdStringify } from '@/shared/lib/sanitize';

/**
 * JSON-LD FAQPage для расширенного сниппета в поиске.
 * Рендерится на сервере рядом со страницей раздела.
 */
export function BlindsFaqJsonLd({ items }: { items: BlindsFaqItem[] }) {
  if (items.length === 0) return null;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schema) }}
    />
  );
}
