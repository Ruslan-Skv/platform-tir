import { WindowBrandFormPage } from '@/views/admin/Content/Windows';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminWindowBrandEditPage({ params }: PageProps) {
  const { id } = await params;
  return <WindowBrandFormPage brandId={id} />;
}
