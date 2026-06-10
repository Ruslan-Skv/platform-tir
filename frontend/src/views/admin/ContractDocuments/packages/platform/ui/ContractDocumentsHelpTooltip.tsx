'use client';

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import cdTemplates from '../../../styles/templates-library.module.css';

export type ContractDocumentsHelpTooltipProps = {
  title: string;
  steps: readonly string[];
  note?: string;
  children: ReactNode;
  /** center — по центру якоря; end — правый край якоря (узкие поля справа). */
  align?: 'center' | 'end';
};

/** Подсказка при наведении (как у инструментов в библиотеке шаблонов). */
export function ContractDocumentsHelpTooltip({
  title,
  steps,
  note,
  children,
  align = 'center',
}: ContractDocumentsHelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const [tooltipPortalReady, setTooltipPortalReady] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setTooltipPortalReady(true);
  }, []);

  const updateTooltipPosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipPos({
      top: rect.bottom + 8,
      left: align === 'end' ? rect.right : rect.left + rect.width / 2,
    });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    updateTooltipPosition();
    const onScrollOrResize = () => updateTooltipPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updateTooltipPosition]);

  const showHelp = () => {
    updateTooltipPosition();
    setOpen(true);
  };

  const hideHelp = () => setOpen(false);

  const portalTarget = tooltipPortalReady && typeof document !== 'undefined' ? document.body : null;

  const tooltipPanel =
    open && tooltipPos && portalTarget
      ? createPortal(
          <div
            role="tooltip"
            className={`${cdTemplates.formatToolbarHelpTooltip} ${
              align === 'end' ? cdTemplates.formatToolbarHelpTooltipAlignEnd : ''
            }`}
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
            }}
            onMouseEnter={showHelp}
            onMouseLeave={hideHelp}
          >
            <strong>{title}</strong>
            <ol>
              {steps.map((step, index) => (
                <li key={`${title}-${index}`}>{step}</li>
              ))}
            </ol>
            {note ? <p>{note}</p> : null}
          </div>,
          portalTarget
        )
      : null;

  return (
    <div
      ref={wrapRef}
      className={cdTemplates.contractFieldHelpWrap}
      onMouseEnter={showHelp}
      onMouseLeave={hideHelp}
      onFocusCapture={showHelp}
      onBlurCapture={(e) => {
        const next = e.relatedTarget;
        if (!wrapRef.current?.contains(next as Node | null)) hideHelp();
      }}
    >
      {children}
      {tooltipPanel}
    </div>
  );
}
