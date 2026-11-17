'use client';

import { useEffect, useRef } from 'react';

import styles from './MeetingsRoom.module.css';

export interface MeetingPrejoinModel {
  title: string;
  connecting: boolean;
  error: string | null;
  onEnter: (withVideo: boolean) => void;
  onCancel: () => void;
}

/**
 * Экран входа: кнопки должны быть нажаты пользователем напрямую —
 * getUserMedia требует user gesture.
 */
export function MeetingPrejoin({
  title,
  connecting,
  error,
  onEnter,
  onCancel,
}: MeetingPrejoinModel) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Локальное превью камеры не запускаем автоматически (жест ещё не был) —
  // фон под превью остаётся нейтральным до входа в комнату.
  useEffect(() => {
    const el = videoRef.current;
    if (el) el.srcObject = null;
  }, []);

  return (
    <div className={styles.prejoin}>
      <h2 className={styles.roomTitle}>{title}</h2>
      <div className={styles.prejoinPreview}>
        <video ref={videoRef} autoPlay playsInline muted />
      </div>
      {error && <p className={styles.prejoinHint}>{error}</p>}
      <p className={styles.prejoinHint}>
        Разрешите доступ к микрофону и камере в браузере. Запись собрания можно включить внутри
        комнаты — файл сохранится на ваш компьютер.
      </p>
      <div className={styles.prejoinActions}>
        <button
          type="button"
          className={`${styles.toolButton} ${styles.toolButtonActive}`}
          disabled={connecting}
          onClick={() => onEnter(true)}
        >
          🎥 Войти с видео
        </button>
        <button
          type="button"
          className={styles.toolButton}
          disabled={connecting}
          onClick={() => onEnter(false)}
        >
          🎧 Только аудио
        </button>
        <button
          type="button"
          className={styles.toolButton}
          onClick={onCancel}
          disabled={connecting}
        >
          Отмена
        </button>
      </div>
      {connecting && <p className={styles.prejoinHint}>Подключаемся к комнате…</p>}
    </div>
  );
}
