'use client';

import { useState } from 'react';

import { getDefaultPeriod } from './payroll-page.utils';

export function usePayrollPage() {
  const [period, setPeriod] = useState(getDefaultPeriod);

  return {
    period,
    setPeriod,
  };
}

export type PayrollPageModel = ReturnType<typeof usePayrollPage>;
