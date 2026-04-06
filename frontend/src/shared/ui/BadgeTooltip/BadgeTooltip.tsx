'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './BadgeTooltip.module.css';

export interface BadgeTooltipProps {
  /** Текст подсказки (если пусто — только children, без подсказки) */
  content: string;
  children: React.ReactElement;
  /**
   * right — подсказка справа от якоря (бэйджи слева от фото).
   * left — слева от якоря.
   */
  side?: 'right' | 'left';
  /** Компактный вид для плотной сетки каталога */
  compact?: boolean;
  /** Задержка перед показом, мс */
  showDelayMs?: number;
}

export function BadgeTooltip({
  content,
  children,
  side = 'right',
  compact = false,
  showDelayMs = 140,
}: BadgeTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    transform: string;
  }>({ top: 0, left: 0, transform: 'translateY(-50%)' });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 10;
    if (side === 'right') {
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
        transform: 'translateY(-50%)',
      });
    } else {
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.left - gap,
        transform: 'translate(-100%, -50%)',
      });
    }
  }, [side]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onMove = () => updatePosition();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, updatePosition]);

  const clearShowTimer = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  };

  const handleEnter = () => {
    const text = content.trim();
    if (!text) return;
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      setOpen(true);
    }, showDelayMs);
  };

  const handleLeave = () => {
    clearShowTimer();
    setOpen(false);
  };

  const trimmed = content.trim();
  if (!trimmed) {
    return children;
  }

  const tooltipClass =
    side === 'right'
      ? `${styles.tooltip} ${styles.tooltip_side_right}`
      : `${styles.tooltip} ${styles.tooltip_side_left}`;
  const compactClass = compact ? ` ${styles.tooltipCompact}` : '';

  return (
    <>
      <span
        ref={triggerRef}
        className={styles.wrap}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
      >
        {children}
      </span>
      {mounted &&
        open &&
        createPortal(
          <div
            role="tooltip"
            className={`${tooltipClass}${compactClass}`}
            style={{
              top: coords.top,
              left: coords.left,
              transform: coords.transform,
            }}
          >
            {trimmed}
          </div>,
          document.body
        )}
    </>
  );
}
