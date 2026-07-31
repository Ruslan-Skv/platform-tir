'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  type WorkDayMyStatus,
  closeForgottenWorkDay,
  endWorkDay,
  endWorkDayAbsence,
  getWorkDayMyStatus,
  startWorkDay,
  startWorkDayAbsence,
} from '@/shared/api/admin-work-days';
import { canRunBackgroundNetwork, whenOnlineSettled } from '@/shared/lib/browser-network';

type WorkDayContextValue = {
  status: WorkDayMyStatus | null;
  loading: boolean;
  error: string | null;
  greeting: string | null;
  refresh: () => Promise<void>;
  handleStartDay: (officeId: string) => Promise<void>;
  handleEndDay: () => Promise<void>;
  handleStartAbsence: (reason?: string, comment?: string) => Promise<void>;
  handleEndAbsence: () => Promise<void>;
  handleCloseForgotten: (workDayId: string, reportedEndTime: string) => Promise<void>;
  clearGreeting: () => void;
};

const WorkDayContext = createContext<WorkDayContextValue | null>(null);

export function WorkDayProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<WorkDayMyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await getWorkDayMyStatus();
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (!canRunBackgroundNetwork()) return;
      void refresh();
    }, 60_000);
    const onWake = () => {
      void whenOnlineSettled(() => {
        void refresh();
      });
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [refresh]);

  const handleStartDay = useCallback(
    async (officeId: string) => {
      const result = await startWorkDay(officeId);
      setGreeting(result.greeting);
      await refresh();
    },
    [refresh]
  );

  const handleEndDay = useCallback(async () => {
    await endWorkDay();
    await refresh();
  }, [refresh]);

  const handleStartAbsence = useCallback(
    async (reason?: string, comment?: string) => {
      await startWorkDayAbsence({ reason, comment });
      await refresh();
    },
    [refresh]
  );

  const handleEndAbsence = useCallback(async () => {
    await endWorkDayAbsence();
    await refresh();
  }, [refresh]);

  const handleCloseForgotten = useCallback(
    async (workDayId: string, reportedEndTime: string) => {
      await closeForgottenWorkDay({ workDayId, reportedEndTime });
      await refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      status,
      loading,
      error,
      greeting,
      refresh,
      handleStartDay,
      handleEndDay,
      handleStartAbsence,
      handleEndAbsence,
      handleCloseForgotten,
      clearGreeting: () => setGreeting(null),
    }),
    [
      status,
      loading,
      error,
      greeting,
      refresh,
      handleStartDay,
      handleEndDay,
      handleStartAbsence,
      handleEndAbsence,
      handleCloseForgotten,
    ]
  );

  return <WorkDayContext.Provider value={value}>{children}</WorkDayContext.Provider>;
}

export function useWorkDay() {
  const ctx = useContext(WorkDayContext);
  if (!ctx) throw new Error('useWorkDay must be used within WorkDayProvider');
  return ctx;
}
