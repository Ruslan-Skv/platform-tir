import { notFound } from 'next/navigation';

import { loadSellerLegalConfig } from '@/features/seller-legal/load-seller-legal-config';
import { SellerLegalPageView } from '@/views/site/legal/SellerLegalPageView';

export default async function SellerLegalPage() {
  const data = await loadSellerLegalConfig();
  if (!data?.isPublished) {
    notFound();
  }
  return <SellerLegalPageView data={data} />;
}
