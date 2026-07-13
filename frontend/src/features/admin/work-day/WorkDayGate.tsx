'use client';

import { useState } from 'react';

import { useWorkDay } from './WorkDayContext';
import styles from './WorkDayGate.module.css';
import { WorkDaysIpHelp } from './WorkDaysIpHelp';

function formatWorkDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function GreetingModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className={styles.greetingOverlay} role="dialog" aria-modal="true">
      <div className={styles.greetingCard}>
        <p className={styles.greetingEmoji}>☀️</p>
        <p className={styles.greetingText}>{message}</p>
        <button type="button" className={styles.primaryBtn} onClick={onClose}>
          Спасибо, приступаю к работе
        </button>
      </div>
    </div>
  );
}

export function WorkDayGate({ children }: { children: React.ReactNode }) {
  const { status, loading, error, greeting, handleStartDay, handleCloseForgotten, clearGreeting } =
    useWorkDay();
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forgottenTime, setForgottenTime] = useState('18:00');
  const [closingForgotten, setClosingForgotten] = useState(false);

  if (loading || !status) {
    return <>{children}</>;
  }

  if (!status.tracked || status.canAccessAdmin) {
    return (
      <>
        {greeting ? <GreetingModal message={greeting} onClose={clearGreeting} /> : null}
        {children}
      </>
    );
  }

  const forgotten = status.forgottenOpenDay;

  const onStart = async () => {
    setActionError(null);
    setStarting(true);
    try {
      await handleStartDay();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setStarting(false);
    }
  };

  const onCloseForgotten = async () => {
    if (!forgotten) return;
    setActionError(null);
    setClosingForgotten(true);
    try {
      await handleCloseForgotten(forgotten.id, forgottenTime);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setClosingForgotten(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.overlay}>
        <div className={styles.card}>
          {forgotten ? (
            <>
              <h2 className={styles.title}>Закройте предыдущий рабочий день</h2>
              <p className={styles.text}>
                {formatWorkDate(forgotten.workDate)} вы не отметили уход с работы. Укажите примерное
                время ухода, чтобы продолжить работу в админке.
              </p>
              <label className={styles.label}>
                Время ухода
                <input
                  type="time"
                  className={styles.input}
                  value={forgottenTime}
                  onChange={(e) => setForgottenTime(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => void onCloseForgotten()}
                disabled={closingForgotten}
              >
                {closingForgotten ? 'Сохранение…' : 'Сохранить и продолжить'}
              </button>
            </>
          ) : (
            <>
              <h2 className={styles.title}>Начните рабочий день</h2>
              <p className={styles.text}>
                Чтобы работать в админке, отметьте начало рабочего дня с компьютера в офисе.
                {status.office ? ` Офис: ${status.office.name}.` : ''}
              </p>
              {!status.isWorkDayToday ? (
                <p className={styles.hint}>Сегодня по вашему графику нерабочий день.</p>
              ) : null}
              <WorkDaysIpHelp variant="compact" />
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => void onStart()}
                disabled={starting || !status.isWorkDayToday}
              >
                {starting ? 'Открытие…' : 'Начать рабочий день'}
              </button>
            </>
          )}
          {(actionError || error) && <p className={styles.error}>{actionError || error}</p>}
        </div>
      </div>
      <div className={styles.blurred} aria-hidden>
        {children}
      </div>
    </div>
  );
}
