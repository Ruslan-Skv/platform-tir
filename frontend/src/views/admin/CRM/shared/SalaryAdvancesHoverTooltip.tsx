'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type { RepairScheduleSalarySummary } from '@/shared/api/crm/admin-repair-schedules';
import { formatInstallerAdvancePaymentMethod } from '@/shared/constants/installerAdvancePaymentMethod';

import styles from './SalaryAdvancesHoverTooltip.module.css';

function formatDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y ? `${d}.${m}.${y}` : iso;
}

function formatRub(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`;
}

type Props = {
  /** Сводка з/п договора; журнал берётся из неё. */
  salary: RepairScheduleSalarySummary;
  children: ReactNode;
};

/**
 * Подсказка колонки «З/п» план-графиков (ремонт, ОДПЖ): при наведении
 * показывает журнал авансов договора — те же записи, что на вкладке «Авансы»
 * модалки «Заказ-наряды». Рисуется порталом в body (position: fixed),
 * чтобы таблица её не обрезала при скролле.
 */
export function SalaryAdvancesHoverTooltip({ salary, children }: Props) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    const tip = popupRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    const pad = 12;
    const tipWidth = tip?.offsetWidth ?? 420;
    const tipHeight = tip?.offsetHeight ?? 160;
    const left = Math.min(Math.max(pad, rect.left), window.innerWidth - pad - tipWidth);
    const top =
      rect.bottom + gap + tipHeight <= window.innerHeight - pad
        ? rect.bottom + gap
        : Math.max(pad, rect.top - gap - tipHeight);
    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    const onMove = () => updatePosition();
    window.addEventListener('scroll', onMove, { passive: true, capture: true });
    window.addEventListener('resize', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onMove, { capture: true });
      window.removeEventListener('resize', onMove);
    };
  }, [open, updatePosition]);

  useEffect(
    () => () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    },
    []
  );

  const handleEnter = () => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    showTimerRef.current = setTimeout(() => setOpen(true), 200);
  };

  const handleLeave = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    setOpen(false);
  };

  const advances = salary.advances ?? [];

  return (
    <div
      ref={triggerRef}
      className={styles.trigger}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {mounted && open
        ? createPortal(
            <div ref={popupRef} role="tooltip" className={styles.popup} style={coords}>
              <p className={styles.title}>
                Журнал авансов · выдано {formatRub(salary.paid)}
                {salary.paidPercent != null ? ` (${salary.paidPercent}%)` : ''}
              </p>
              {advances.length === 0 ? (
                <p className={styles.empty}>Авансы по договору ещё не выдавались</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Мастер</th>
                      <th>Сумма</th>
                      <th>Способ</th>
                      <th>Кто выдал</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advances.map((row) => (
                      <tr key={row.id} title={row.note?.trim() || undefined}>
                        <td className={styles.nowrap}>{formatDay(row.paidAt)}</td>
                        <td>{row.installerName ?? '—'}</td>
                        <td className={styles.nowrap}>{formatRub(row.amount)}</td>
                        <td>{formatInstallerAdvancePaymentMethod(row.paymentMethod)}</td>
                        <td>{row.createdByName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
