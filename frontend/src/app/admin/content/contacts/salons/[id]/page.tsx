import { ContactSalonEditPageView } from '@/views/admin/Content/Contacts/ContactSalonEditPageView';

type EditContactSalonAdminPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditContactSalonAdminPage({
  params,
}: EditContactSalonAdminPageProps) {
  const { id } = await params;
  return <ContactSalonEditPageView salonId={id} />;
}
