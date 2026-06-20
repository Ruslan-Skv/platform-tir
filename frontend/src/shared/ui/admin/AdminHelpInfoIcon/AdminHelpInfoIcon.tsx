'use client';

import { type HTMLAttributes, useEffect, useRef, useState } from 'react';

import styles from './AdminHelpInfoIcon.module.css';

const GIF_SRC = '/icons/admin-help-info.gif';
const STATIC_SRC = '/icons/admin-help-info-static.png';
const DEFAULT_PLAY_INTERVAL_MS = 10_000;
const DEFAULT_PLAY_DURATION_MS = 1_800;

export type AdminHelpInfoIconProps = HTMLAttributes<HTMLSpanElement> & {
  /** Размер иконки в px */
  size?: number;
  /** Пауза между проигрываниями анимации, мс */
  playIntervalMs?: number;
  /** Сколько длится одно проигрывание, мс */
  playDurationMs?: number;
};

/** Зелёная «i» с редкой анимацией — для подсказок и информационных кнопок в админке. */
export function AdminHelpInfoIcon({
  className,
  size = 14,
  playIntervalMs = DEFAULT_PLAY_INTERVAL_MS,
  playDurationMs = DEFAULT_PLAY_DURATION_MS,
  style,
  ...props
}: AdminHelpInfoIconProps) {
  const [playing, setPlaying] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const startPlay = () => {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
      }
      setPlayKey((key) => key + 1);
      setPlaying(true);
      stopTimerRef.current = setTimeout(() => {
        setPlaying(false);
        stopTimerRef.current = null;
      }, playDurationMs);
    };

    const firstPlayTimer = setTimeout(startPlay, playIntervalMs);
    const intervalId = setInterval(startPlay, playIntervalMs);

    return () => {
      clearTimeout(firstPlayTimer);
      clearInterval(intervalId);
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
      }
    };
  }, [playIntervalMs, playDurationMs]);

  return (
    <span
      className={[styles.wrap, className].filter(Boolean).join(' ')}
      style={{ width: size, height: size, ...style }}
      aria-hidden
      {...props}
    >
      {playing ? (
        <img
          key={playKey}
          src={GIF_SRC}
          alt=""
          className={styles.iconImage}
          style={{ width: size, height: size }}
        />
      ) : (
        <img
          src={STATIC_SRC}
          alt=""
          className={styles.iconImage}
          style={{ width: size, height: size }}
        />
      )}
    </span>
  );
}
