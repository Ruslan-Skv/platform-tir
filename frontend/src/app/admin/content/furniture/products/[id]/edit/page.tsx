import { FurnitureProductFormPage } from '@/views/admin/Content/Furniture';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminFurnitureProductEditPage({ params }: PageProps) {
  const { id } = await params;
  return <FurnitureProductFormPage productId={id} />;
}
