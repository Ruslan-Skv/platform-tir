'use client';

import { PhotoPageView } from './PhotoPageView';
import { type PhotoPageProps, usePhotoPage } from './hooks/usePhotoPage';

export function PhotoPage(props: PhotoPageProps) {
  const model = usePhotoPage(props);
  return <PhotoPageView model={model} />;
}

export type { PhotoPageProps };
