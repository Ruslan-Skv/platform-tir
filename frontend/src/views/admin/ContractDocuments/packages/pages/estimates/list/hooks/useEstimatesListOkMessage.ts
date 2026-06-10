import { useCallback, useEffect, useRef, useState } from 'react';

export function useEstimatesListOkMessage() {
  const [ok, setOk] = useState<string | null>(null);
  const okMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showOkMessage = useCallback((text: string, dismissMs: number) => {
    if (okMessageTimerRef.current) clearTimeout(okMessageTimerRef.current);
    setOk(text);
    okMessageTimerRef.current = setTimeout(() => {
      setOk((prev) => (prev === text ? null : prev));
      okMessageTimerRef.current = null;
    }, dismissMs);
  }, []);

  const showAutosaveOk = useCallback(() => {
    showOkMessage('Сохранено.', 1200);
  }, [showOkMessage]);

  const clearOkMessage = useCallback(() => {
    if (okMessageTimerRef.current) clearTimeout(okMessageTimerRef.current);
    okMessageTimerRef.current = null;
    setOk(null);
  }, []);

  useEffect(() => {
    return () => {
      if (okMessageTimerRef.current) clearTimeout(okMessageTimerRef.current);
    };
  }, []);

  return { ok, showOkMessage, showAutosaveOk, clearOkMessage };
}
