'use client';

import type { FurnitureSectionData } from '@/shared/api/furniture';

import { FurniturePageView } from './FurniturePageView';
import { useFurniturePage } from './hooks/useFurniturePage';

export function FurniturePage({ initialData }: { initialData: FurnitureSectionData | null }) {
  const model = useFurniturePage(initialData);
  return <FurniturePageView model={model} />;
}
