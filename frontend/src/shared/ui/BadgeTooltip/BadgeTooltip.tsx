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
  /** Максимальная ширина подсказки, px (для длинных текстов) */
  maxWidth?: number;
  /** Широкий блок для многострочных подсказок */
  wide?: boolean;
  /** Задержка перед показом, мс */
  showDelayMs?: number;
}

export function BadgeTooltip({
  content,
  children,
  side = 'right',
  compact = false,
  maxWidth,
  wide = false,
  showDelayMs = 140,
}: BadgeTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
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
    const tip = tooltipRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 10;
    const pad = 12;
    let top = rect.top + rect.height / 2;
    let left = side === 'right' ? rect.right + gap : rect.left - gap;
    let transform = side === 'right' ? 'translateY(-50%)' : 'translate(-100%, -50%)';

    if (tip) {
      const tipH = tip.offsetHeight;
      const tipW = tip.offsetWidth;
      const halfH = tipH / 2;
      if (top - halfH < pad) top = pad + halfH;
      if (top + halfH > window.innerHeight - pad) top = window.innerHeight - pad - halfH;

      if (side === 'left' && left - tipW < pad) {
        left = rect.right + gap;
        transform = 'translateY(-50%)';
      } else if (side === 'right' && left + tipW > window.innerWidth - pad) {
        left = rect.left - gap;
        transform = 'translate(-100%, -50%)';
      }
    }

    setCoords({ top, left, transform });
  }, [side]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = requestAnimationFrame(() => updatePosition());
    const onMove = () => updatePosition();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, updatePosition, content, maxWidth]);

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
  const wideClass = wide ? ` ${styles.tooltipWide}` : '';

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
            ref={tooltipRef}
            role="tooltip"
            className={`${tooltipClass}${compactClass}${wideClass}`}
            style={{
              top: coords.top,
              left: coords.left,
              transform: coords.transform,
              ...(maxWidth != null ? { maxWidth: `${maxWidth}px` } : null),
            }}
          >
            {trimmed}
          </div>,
          document.body
        )}
    </>
  );
}
