'use client';

import { useCallback, useState } from 'react';

const DEFAULT_DURATION_MS = 3000;

type UseAdminSaveFeedbackOptions = {
  successDurationMs?: number;
  errorDurationMs?: number;
};

export function useAdminSaveFeedback(options: UseAdminSaveFeedbackOptions = {}) {
  const successDurationMs = options.successDurationMs ?? DEFAULT_DURATION_MS;
  const errorDurationMs = options.errorDurationMs ?? DEFAULT_DURATION_MS;

  const [saveNoticeVisible, setSaveNoticeVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetSaveFeedback = useCallback(() => {
    setSaveNoticeVisible(false);
    setErrorMessage(null);
  }, []);

  const showSaveSuccess = useCallback(() => {
    setErrorMessage(null);
    setSaveNoticeVisible(true);
    setTimeout(() => setSaveNoticeVisible(false), successDurationMs);
  }, [successDurationMs]);

  const showSaveError = useCallback(
    (text: string) => {
      setSaveNoticeVisible(false);
      setErrorMessage(text);
      setTimeout(() => setErrorMessage(null), errorDurationMs);
    },
    [errorDurationMs]
  );

  return {
    saveNoticeVisible,
    errorMessage,
    showSaveSuccess,
    showSaveError,
    resetSaveFeedback,
  };
}
