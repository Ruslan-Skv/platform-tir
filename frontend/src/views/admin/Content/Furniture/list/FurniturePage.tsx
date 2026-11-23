'use client';

import { FurnitureAdminPageView } from './FurniturePageView';
import { useFurnitureAdminPage } from './hooks/useFurniturePage';

export function FurnitureSectionPage() {
  const model = useFurnitureAdminPage();
  return <FurnitureAdminPageView model={model} />;
}
