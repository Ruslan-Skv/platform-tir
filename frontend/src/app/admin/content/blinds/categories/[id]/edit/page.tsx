import { BlindsCategoryFormPage } from '@/views/admin/Content/Blinds';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBlindsCategoryEditPage({ params }: PageProps) {
  const { id } = await params;
  return <BlindsCategoryFormPage categoryId={id} />;
}
