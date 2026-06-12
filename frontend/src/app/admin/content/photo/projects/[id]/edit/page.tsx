import { PhotoProjectFormPage } from '@/views/admin/Content/Photo';

interface EditPhotoProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPhotoProjectPage({ params }: EditPhotoProjectPageProps) {
  const { id } = await params;
  return <PhotoProjectFormPage projectId={id} />;
}
