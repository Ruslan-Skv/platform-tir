import { loadPublicOffersList } from '@/features/public-offer/load-public-offer-config';
import { PublicOfferIndexPageView } from '@/views/site/offer/PublicOfferIndexPageView';

export default async function PublicOffersIndexPage() {
  const offers = await loadPublicOffersList();
  return <PublicOfferIndexPageView offers={offers} />;
}
