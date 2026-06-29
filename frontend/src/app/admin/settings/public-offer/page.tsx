import { redirect } from 'next/navigation';

export default function LegacyPublicOfferAdminPage() {
  redirect('/admin/settings/public-offers');
}
