import { notFound } from 'next/navigation';

import { loadPublicOfferRevision } from '@/features/public-offer/load-public-offer-config';
import { PublicOfferRevisionPageView } from '@/views/site/offer/PublicOfferRevisionPageView';

type Props = {
  params: Promise<{ slug: string; versionNumber: string }>;
};

export default async function PublicOfferRevisionPage({ params }: Props) {
  const { slug, versionNumber: versionRaw } = await params;
  const versionNumber = Number(versionRaw);
  if (!Number.isInteger(versionNumber) || versionNumber < 1) {
    notFound();
  }

  const data = await loadPublicOfferRevision(slug, versionNumber);
  if (!data) {
    notFound();
  }

  return <PublicOfferRevisionPageView data={data} />;
}
