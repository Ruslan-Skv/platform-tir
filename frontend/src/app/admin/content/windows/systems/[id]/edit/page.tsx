import { WindowSystemFormPage } from '@/views/admin/Content/Windows';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminWindowSystemEditPage({ params }: PageProps) {
  const { id } = await params;
  return <WindowSystemFormPage systemId={id} />;
}
