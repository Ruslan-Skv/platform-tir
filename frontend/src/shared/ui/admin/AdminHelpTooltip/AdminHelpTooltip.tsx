'use client';

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './AdminHelpTooltip.module.css';

export type AdminHelpTooltipContent = {
  title: string;
  steps?: readonly string[];
  note?: string;
  body?: ReactNode;
};

export type AdminHelpTooltipProps = AdminHelpTooltipContent & {
  children: ReactNode;
  /** center — по центру якоря; end — правый край якоря (узкие поля справа). */
  align?: 'center' | 'end';
  wrapClassName?: string;
  tooltipId?: string;
  /** Не показывать подсказку (например, при disabled-триггере). */
  disabled?: boolean;
  /** Задержка перед показом, мс. */
  showDelayMs?: number;
  /** Задержка перед скрытием, мс — чтобы успеть навести на панель через зазор. */
  hideDelayMs?: number;
  /** Вызывается при открытии подсказки (например, для подгрузки данных). */
  onShow?: () => void;
  /** Дополнительный класс панели подсказки. */
  panelClassName?: string;
};

const DEFAULT_SHOW_DELAY_MS = 150;
const DEFAULT_HIDE_DELAY_MS = 200;
const POSITION_EPSILON_PX = 1;

type TooltipPosition = { top: number; left: number };

function positionsClose(a: TooltipPosition, b: TooltipPosition): boolean {
  return (
    Math.abs(a.top - b.top) < POSITION_EPSILON_PX && Math.abs(a.left - b.left) < POSITION_EPSILON_PX
  );
}

export function AdminHelpTooltip({
  title,
  steps = [],
  note,
  body,
  children,
  align = 'center',
  wrapClassName = styles.wrap,
  tooltipId,
  disabled = false,
  showDelayMs = DEFAULT_SHOW_DELAY_MS,
  hideDelayMs = DEFAULT_HIDE_DELAY_MS,
  onShow,
  panelClassName,
}: AdminHelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const [tooltipPortalReady, setTooltipPortalReady] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionRafRef = useRef<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);

  useEffect(() => {
    setTooltipPortalReady(true);
  }, []);

  useEffect(
    () => () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (positionRafRef.current) cancelAnimationFrame(positionRafRef.current);
    },
    []
  );

  const computeTooltipPosition = useCallback((): TooltipPosition | null => {
    const el = wrapRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: align === 'end' ? rect.right : rect.left + rect.width / 2,
    };
  }, [align]);

  const applyTooltipPosition = useCallback((next: TooltipPosition) => {
    setTooltipPos((prev) => (prev && positionsClose(prev, next) ? prev : next));

    const panel = panelRef.current;
    if (panel) {
      panel.style.top = `${next.top}px`;
      panel.style.left = `${next.left}px`;
    }
  }, []);

  const updateTooltipPosition = useCallback(() => {
    const next = computeTooltipPosition();
    if (next) applyTooltipPosition(next);
  }, [applyTooltipPosition, computeTooltipPosition]);

  const schedulePositionUpdate = useCallback(() => {
    if (positionRafRef.current !== null) return;
    positionRafRef.current = requestAnimationFrame(() => {
      positionRafRef.current = null;
      updateTooltipPosition();
    });
  }, [updateTooltipPosition]);

  useLayoutEffect(() => {
    if (!open) return;
    updateTooltipPosition();
    const onScrollOrResize = () => schedulePositionUpdate();
    window.addEventListener('scroll', onScrollOrResize);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, schedulePositionUpdate, updateTooltipPosition]);

  const clearShowTimer = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  };

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const showHelp = () => {
    if (disabled) return;
    clearHideTimer();
    if (open) return;

    const openTooltip = () => {
      onShow?.();
      updateTooltipPosition();
      setOpen(true);
    };

    if (showDelayMs <= 0) {
      openTooltip();
      return;
    }

    clearShowTimer();
    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null;
      openTooltip();
    }, showDelayMs);
  };

  const scheduleHide = () => {
    clearShowTimer();
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setOpen(false);
    }, hideDelayMs);
  };

  const portalTarget = tooltipPortalReady && typeof document !== 'undefined' ? document.body : null;

  const tooltipPanel =
    open && tooltipPos && portalTarget
      ? createPortal(
          <div
            ref={panelRef}
            id={tooltipId}
            role="tooltip"
            className={`${styles.panel} ${
              align === 'end' ? styles.panelAlignEnd : styles.panelAlignCenter
            } ${panelClassName ?? ''}`}
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
            }}
            onMouseEnter={showHelp}
            onMouseLeave={scheduleHide}
          >
            <strong>{title}</strong>
            {body != null ? (
              <div className={styles.body}>{body}</div>
            ) : (
              <>
                {steps.length > 0 ? (
                  <ol>
                    {steps.map((step, index) => (
                      <li key={`${title}-${index}`}>{step}</li>
                    ))}
                  </ol>
                ) : null}
                {note ? <p>{note}</p> : null}
              </>
            )}
          </div>,
          portalTarget
        )
      : null;

  return (
    <div
      ref={wrapRef}
      className={wrapClassName}
      onMouseEnter={showHelp}
      onMouseLeave={scheduleHide}
      onFocusCapture={showHelp}
      onBlurCapture={(e) => {
        const next = e.relatedTarget;
        if (!wrapRef.current?.contains(next as Node | null)) {
          scheduleHide();
        }
      }}
    >
      {children}
      {tooltipPanel}
    </div>
  );
}
