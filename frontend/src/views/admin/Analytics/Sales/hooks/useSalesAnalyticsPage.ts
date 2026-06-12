'use client';

import { useState } from 'react';

export function useSalesAnalyticsPage() {
  const [period, setPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return {
    period,
    setPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  };
}

export type SalesAnalyticsPageModel = ReturnType<typeof useSalesAnalyticsPage>;
