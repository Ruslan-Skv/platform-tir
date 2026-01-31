import { PhotoProjectFormPage } from '@/pages/admin/Content/PhotoProjectFormPage';

interface EditPhotoProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPhotoProjectPage({ params }: EditPhotoProjectPageProps) {
  const { id } = await params;
  return <PhotoProjectFormPage projectId={id} />;
}
