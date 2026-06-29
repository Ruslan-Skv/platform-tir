import { loadPublicContacts } from '@/features/contacts/load-contacts-config';
import { ContactsPageView } from '@/views/site/contacts/ContactsPageView';

export default async function ContactsPage() {
  const data = await loadPublicContacts();
  return <ContactsPageView data={data} />;
}

export function generateMetadata() {
  return {
    title: 'Контакты | Территория интерьерных решений',
    description:
      'Адреса салонов, телефоны и контакты менеджеров компании «Территория интерьерных решений» в Мурманске.',
  };
}
