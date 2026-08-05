'use client';

import { MyFurnitureSchedulesPageView } from './MyFurnitureSchedulesPageView';
import { useMyFurnitureSchedulesPage } from './hooks/useMyFurnitureSchedulesPage';

export function MyFurnitureSchedulesPage() {
  const model = useMyFurnitureSchedulesPage();
  return <MyFurnitureSchedulesPageView model={model} />;
}
