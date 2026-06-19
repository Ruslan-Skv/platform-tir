'use client';

import { AdminHelpTooltip, type AdminHelpTooltipContent } from '@/shared/ui/admin/AdminHelpTooltip';
import {
  TEMPLATE_EDITOR_ZOOM_MAX_PCT,
  TEMPLATE_EDITOR_ZOOM_MIN_PCT,
} from '@/views/admin/ContractDocuments/packages/platform/templateEditorHistory';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

export type FormatToolHelp = AdminHelpTooltipContent;

export type FormatTool = {
  id: string;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  ariaPressed?: boolean;
  wideGlyph?: boolean;
  help?: FormatToolHelp;
};

export function FormatToolbarSvgIcon({
  icon: Icon,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return <Icon className={cdTemplates.formatToolbarSvg} aria-hidden />;
}

export function FormatToolbarGlyph({ children }: { children: React.ReactNode }) {
  return <span className={cdTemplates.formatToolbarGlyph}>{children}</span>;
}

export function FormatToolbarHelpTooltip({
  title,
  steps = [],
  note,
  disabled,
  isActive,
  ariaPressed,
  wideGlyph,
  onClick,
  children,
}: {
  title: string;
  steps?: readonly string[];
  note?: string;
  disabled?: boolean;
  isActive?: boolean;
  ariaPressed?: boolean;
  wideGlyph?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <AdminHelpTooltip
      title={title}
      steps={steps}
      note={note}
      disabled={disabled}
      wrapClassName={cdTemplates.formatToolbarHelpWrap}
    >
      <button
        type="button"
        className={`${cdTemplates.formatBtn} ${wideGlyph ? cdTemplates.formatBtnWideGlyph : ''} ${isActive ? cdTemplates.formatBtnActive : ''}`}
        aria-label={title}
        aria-pressed={ariaPressed}
        disabled={disabled}
        onClick={onClick}
        onMouseDown={(e) => e.preventDefault()}
      >
        {children}
      </button>
    </AdminHelpTooltip>
  );
}

export function TemplateEditorZoomControl({
  id,
  value,
  draft,
  disabled,
  ariaLabel,
  title,
  onDraftChange,
  onCommit,
  onStep,
}: {
  id: string;
  value: number;
  draft: string | null;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  onDraftChange: (draft: string | null) => void;
  onCommit: () => void;
  onStep: (delta: number) => void;
}) {
  const atMin = value <= TEMPLATE_EDITOR_ZOOM_MIN_PCT;
  const atMax = value >= TEMPLATE_EDITOR_ZOOM_MAX_PCT;

  return (
    <div
      className={cdTemplates.templatesLibraryVisualZoom}
      role="group"
      aria-label={ariaLabel}
      title={title}
    >
      <button
        type="button"
        className={cdTemplates.templatesLibraryVisualZoomBtn}
        disabled={disabled || atMin}
        aria-label="Уменьшить масштаб"
        onClick={() => onStep(-5)}
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className={cdTemplates.templatesLibraryVisualZoomInput}
        value={draft ?? String(value)}
        disabled={disabled}
        aria-label={`${ariaLabel}, проценты`}
        onChange={(e) => {
          onDraftChange(e.target.value.replace(/\D/g, '').slice(0, 3));
        }}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCommit();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
      />
      <span className={cdTemplates.templatesLibraryVisualZoomSuffix} aria-hidden>
        %
      </span>
      <button
        type="button"
        className={cdTemplates.templatesLibraryVisualZoomBtn}
        disabled={disabled || atMax}
        aria-label="Увеличить масштаб"
        onClick={() => onStep(5)}
      >
        +
      </button>
    </div>
  );
}

export type ParagraphTextAlign = 'left' | 'center' | 'right' | 'justify';

export function FormatToolbarTextAlignIcon({ kind }: { kind: ParagraphTextAlign }) {
  const lineProps = {
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
  };
  const lines: { x1: number; x2: number; y: number }[] =
    kind === 'left'
      ? [
          { x1: 4, x2: 18, y: 7 },
          { x1: 4, x2: 20, y: 12 },
          { x1: 4, x2: 15, y: 17 },
        ]
      : kind === 'center'
        ? [
            { x1: 6, x2: 18, y: 7 },
            { x1: 5, x2: 19, y: 12 },
            { x1: 7, x2: 17, y: 17 },
          ]
        : kind === 'right'
          ? [
              { x1: 6, x2: 20, y: 7 },
              { x1: 4, x2: 20, y: 12 },
              { x1: 9, x2: 20, y: 17 },
            ]
          : [
              { x1: 4, x2: 20, y: 7 },
              { x1: 4, x2: 20, y: 12 },
              { x1: 4, x2: 20, y: 17 },
            ];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={cdTemplates.formatToolbarSvg}
      aria-hidden
    >
      {lines.map((line) => (
        <line
          key={`${line.y}-${line.x1}`}
          x1={line.x1}
          y1={line.y}
          x2={line.x2}
          y2={line.y}
          {...lineProps}
        />
      ))}
    </svg>
  );
}
