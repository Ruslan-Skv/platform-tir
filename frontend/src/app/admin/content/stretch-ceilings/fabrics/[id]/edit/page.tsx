import { CeilingFabricFormPage } from '@/views/admin/Content/StretchCeilings';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCeilingFabricEditPage({ params }: PageProps) {
  const { id } = await params;
  return <CeilingFabricFormPage fabricId={id} />;
}
