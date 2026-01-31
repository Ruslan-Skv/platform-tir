import { PromotionFormPage } from '@/pages/admin/Content/PromotionFormPage';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPromotionEditPage({ params }: PageProps) {
  const { id } = await params;
  return <PromotionFormPage promotionId={id} />;
}
