'use client';

import { PhotoSectionPageView } from './PhotoSectionPageView';
import { usePhotoSectionPage } from './hooks/usePhotoSectionPage';

export function PhotoSectionPage() {
  const model = usePhotoSectionPage();
  return <PhotoSectionPageView model={model} />;
}
