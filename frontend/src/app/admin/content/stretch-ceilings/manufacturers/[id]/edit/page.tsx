import { CeilingManufacturerFormPage } from '@/views/admin/Content/StretchCeilings';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCeilingManufacturerEditPage({ params }: PageProps) {
  const { id } = await params;
  return <CeilingManufacturerFormPage manufacturerId={id} />;
}
