import { notFound } from 'next/navigation';

import { loadPublicOfferBySlug } from '@/features/public-offer/load-public-offer-config';
import { PublicOfferPageView } from '@/views/site/offer/PublicOfferPageView';

type PublicOfferSlugPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicOfferSlugPage({ params }: PublicOfferSlugPageProps) {
  const { slug } = await params;
  const data = await loadPublicOfferBySlug(slug);
  if (!data) {
    notFound();
  }
  return <PublicOfferPageView data={data} />;
}
