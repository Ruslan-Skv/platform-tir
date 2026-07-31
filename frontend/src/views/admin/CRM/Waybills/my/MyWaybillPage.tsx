'use client';

import { MyWaybillPageView } from './MyWaybillPageView';
import { useMyWaybillPage } from './hooks/useMyWaybillPage';

export function MyWaybillPage() {
  const model = useMyWaybillPage();
  return <MyWaybillPageView model={model} />;
}
