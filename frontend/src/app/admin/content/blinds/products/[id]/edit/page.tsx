import { BlindsProductFormPage } from '@/views/admin/Content/Blinds';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBlindsProductEditPage({ params }: PageProps) {
  const { id } = await params;
  return <BlindsProductFormPage productId={id} />;
}
