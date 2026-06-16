import { useCallback, useEffect, useRef, useState } from 'react';

export function formatQuizCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function getQuizTimeLimitSeconds(questionCount: number, minutesPerQuestion: number): number {
  return questionCount * minutesPerQuestion * 60;
}

export function formatMinutesRu(totalMinutes: number): string {
  const mod10 = totalMinutes % 10;
  const mod100 = totalMinutes % 100;
  if (mod10 === 1 && mod100 !== 11) return `${totalMinutes} минута`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${totalMinutes} минуты`;
  }
  return `${totalMinutes} минут`;
}

export function useKnowledgeQuizTimer(active: boolean, totalSeconds: number, onExpire: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const expiredRef = useRef(false);

  const start = useCallback(() => {
    expiredRef.current = false;
    setSecondsLeft(totalSeconds);
  }, [totalSeconds]);

  const reset = useCallback(() => {
    expiredRef.current = false;
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    if (!active || secondsLeft === null) return;

    if (secondsLeft <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
      return;
    }

    const id = window.setTimeout(() => {
      setSecondsLeft((current) => (current !== null ? current - 1 : current));
    }, 1000);

    return () => clearTimeout(id);
  }, [active, secondsLeft, onExpire]);

  return {
    secondsLeft,
    start,
    reset,
    isRunning: active && secondsLeft !== null && secondsLeft > 0,
  };
}
