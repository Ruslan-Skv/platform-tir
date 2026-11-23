import { FurnitureCategoryFormPage } from '@/views/admin/Content/Furniture';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminFurnitureCategoryEditPage({ params }: PageProps) {
  const { id } = await params;
  return <FurnitureCategoryFormPage categoryId={id} />;
}
