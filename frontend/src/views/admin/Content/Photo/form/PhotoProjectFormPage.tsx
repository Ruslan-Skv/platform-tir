'use client';

import { PhotoProjectFormPageView } from './PhotoProjectFormPageView';
import { usePhotoProjectFormPage } from './hooks/usePhotoProjectFormPage';

interface PhotoProjectFormPageProps {
  projectId?: string;
}

export function PhotoProjectFormPage({ projectId }: PhotoProjectFormPageProps) {
  const model = usePhotoProjectFormPage({ projectId });
  return <PhotoProjectFormPageView model={model} />;
}
