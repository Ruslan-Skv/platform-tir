'use client';

import { CalendarPageView } from './CalendarPageView';
import { useCalendarPage } from './hooks/useCalendarPage';

export function CalendarPage() {
  const model = useCalendarPage();
  return <CalendarPageView model={model} />;
}
