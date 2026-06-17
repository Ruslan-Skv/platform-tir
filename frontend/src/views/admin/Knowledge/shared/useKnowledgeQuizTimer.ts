import { useCallback, useEffect, useRef, useState } from 'react';

export function formatQuizCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatBlockedCountdown(seconds: number): string {
  if (seconds <= 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours} ч ${minutes} мин ${secs.toString().padStart(2, '0')} сек`;
  }

  return formatQuizCountdown(seconds);
}

export function getSecondsUntil(isoDate: string | null, nowMs = Date.now()): number | null {
  if (!isoDate) return null;
  const targetMs = new Date(isoDate).getTime();
  if (Number.isNaN(targetMs)) return null;
  return Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
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

export function useBlockedCountdown(targetIso: string | null, active: boolean) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    active ? getSecondsUntil(targetIso) : null
  );

  useEffect(() => {
    if (!active || !targetIso) {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const next = getSecondsUntil(targetIso);
      setSecondsLeft(next);
      return next;
    };

    tick();
    const id = window.setInterval(() => {
      const next = tick();
      if (next !== null && next <= 0) {
        clearInterval(id);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [active, targetIso]);

  return secondsLeft;
}
