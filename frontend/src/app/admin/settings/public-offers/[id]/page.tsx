import { PublicOfferEditPageView } from '@/views/admin/Settings/public-offers/PublicOfferEditPageView';

type EditPublicOfferAdminPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPublicOfferAdminPage({ params }: EditPublicOfferAdminPageProps) {
  const { id } = await params;
  return <PublicOfferEditPageView offerId={id} />;
}
