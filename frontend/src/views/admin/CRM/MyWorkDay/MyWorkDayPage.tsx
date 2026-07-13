'use client';

import { MyWorkDayPageView } from './MyWorkDayPageView';
import { useMyWorkDayPage } from './hooks/useMyWorkDayPage';

export function MyWorkDayPage() {
  const model = useMyWorkDayPage();
  return <MyWorkDayPageView model={model} />;
}
