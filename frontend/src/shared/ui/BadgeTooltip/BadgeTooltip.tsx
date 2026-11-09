'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './BadgeTooltip.module.css';

export interface BadgeTooltipProps {
  /** Текст подсказки (если пусто — только children, без подсказки);
      для сложной вёрстки (заголовок + абзац) можно передать React-узел */
  content: string | React.ReactNode;
  children: React.ReactElement;
  /**
   * right — подсказка справа от якоря (бэйджи слева от фото).
   * left — слева от якоря.
   * bottom — под якорем, выровнена по его левому краю (знак «Победа» в логотипе).
   */
  side?: 'right' | 'left' | 'bottom';
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
    let top: number;
    let left: number;
    let transform: string;

    if (side === 'bottom') {
      top = rect.bottom + gap;
      left = rect.left;
      transform = 'none';
      if (tip) {
        const tipW = tip.offsetWidth;
        const tipH = tip.offsetHeight;
        // Не вылезать за правый край — сдвигаемся влево, но не дальше отступа
        if (left + tipW > window.innerWidth - pad) {
          left = Math.max(pad, window.innerWidth - pad - tipW);
        }
        // Не вылезать за нижний край — переносим подсказку над якорем
        if (top + tipH > window.innerHeight - pad) {
          top = Math.max(pad, rect.top - gap - tipH);
        }
      }
    } else {
      top = rect.top + rect.height / 2;
      left = side === 'right' ? rect.right + gap : rect.left - gap;
      transform = side === 'right' ? 'translateY(-50%)' : 'translate(-100%, -50%)';

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

  const isEmptyContent = typeof content === 'string' ? !content.trim() : content == null;

  const handleEnter = () => {
    if (isEmptyContent) return;
    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      setOpen(true);
    }, showDelayMs);
  };

  const handleLeave = () => {
    clearShowTimer();
    setOpen(false);
  };

  if (isEmptyContent) {
    return children;
  }

  const tooltipClass =
    side === 'right'
      ? `${styles.tooltip} ${styles.tooltip_side_right}`
      : side === 'left'
        ? `${styles.tooltip} ${styles.tooltip_side_left}`
        : `${styles.tooltip} ${styles.tooltip_side_bottom}`;
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
              /* min(): на узких экранах пиксельный максимум не должен перебивать
                 адаптивное ограничение ширины из css-классов */
              ...(maxWidth != null ? { maxWidth: `min(${maxWidth}px, calc(100vw - 32px))` } : null),
            }}
          >
            {typeof content === 'string' ? content.trim() : content}
          </div>,
          document.body
        )}
    </>
  );
}
