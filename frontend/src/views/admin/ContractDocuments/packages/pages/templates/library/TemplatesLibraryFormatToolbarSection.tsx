'use client';

import { Fragment } from 'react';

import { FONT_SIZE_TOOLTIP } from '@/views/admin/ContractDocuments/core/typography/contractTemplateTypography';
import { PACKAGE_CONTRACT_PLACEHOLDER_GROUPS } from '@/views/admin/ContractDocuments/packages/platform/form/contractPlaceholders';

import cdTemplates from '../../../../styles/templates-library.module.css';
import { FormatToolbarHelpTooltip } from './editor/templateEditorFormatToolbar';
import { VISUAL_FONT_SIZE_PT_OPTIONS } from './editor/templateEditorFormatting';
import type { TemplatesLibraryPageModel } from './hooks/useTemplatesLibraryPage';

export type TemplatesLibraryFormatToolbarSectionProps = Pick<
  TemplatesLibraryPageModel,
  | 'activeTemplateTab'
  | 'applyVisualFontSizeFromToolbar'
  | 'captureVisualSelection'
  | 'editorMode'
  | 'formatTools'
  | 'insertPlaceholder'
  | 'isSuperAdmin'
  | 'placeholdersCollapsed'
  | 'renderCleanupToolbar'
  | 'renderListToolbar'
  | 'renderTableStructureToolbar'
  | 'togglePlaceholdersCollapsed'
  | 'visualFontSizeControl'
>;

export function TemplatesLibraryFormatToolbarSection(
  props: TemplatesLibraryFormatToolbarSectionProps
) {
  const {
    formatTools,
    activeTemplateTab,
    isSuperAdmin,
    renderCleanupToolbar,
    renderListToolbar,
    renderTableStructureToolbar,
    visualFontSizeControl,
    editorMode,
    captureVisualSelection,
    applyVisualFontSizeFromToolbar,
    placeholdersCollapsed,
    togglePlaceholdersCollapsed,
    insertPlaceholder,
  } = props;

  return (
    <div
      className={`${cdTemplates.contractTopTools} ${cdTemplates.blockTools} ${cdTemplates.templatesLibraryTopToolsStack}`}
    >
      <div
        className={`${cdTemplates.formatToolbar} ${cdTemplates.templatesLibraryFormatToolbarRow}`}
        role="toolbar"
        aria-label="Инструменты форматирования"
      >
        {formatTools.map((tool) => {
          if (tool.id === 'spacing-contract-dense' && activeTemplateTab !== 'contract') {
            return null;
          }
          if (tool.id === 'spacing-contract-dense' && tool.help) {
            return (
              <FormatToolbarHelpTooltip
                key={tool.id}
                title={tool.help.title}
                steps={tool.help.steps}
                note={tool.help.note}
                disabled={!isSuperAdmin}
                onClick={tool.onClick}
              >
                {tool.icon}
              </FormatToolbarHelpTooltip>
            );
          }
          if (tool.id === 'signatures') {
            const actSignaturesTool = formatTools.find(
              (t) => t.id === 'signatures-act-handwritten'
            );
            return (
              <Fragment key="cleanup-and-insert-toolbar">
                {renderCleanupToolbar()}
                <button
                  key="signatures"
                  type="button"
                  className={`${cdTemplates.formatBtn} ${tool.isActive ? cdTemplates.formatBtnActive : ''}`}
                  title={tool.title}
                  aria-label={tool.title}
                  aria-pressed={tool.ariaPressed}
                  onClick={tool.onClick}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={!isSuperAdmin}
                >
                  {tool.icon}
                </button>
                {actSignaturesTool?.help ? (
                  <FormatToolbarHelpTooltip
                    key={actSignaturesTool.id}
                    title={actSignaturesTool.help.title}
                    steps={actSignaturesTool.help.steps}
                    note={actSignaturesTool.help.note}
                    disabled={!isSuperAdmin}
                    onClick={actSignaturesTool.onClick}
                  >
                    {actSignaturesTool.icon}
                  </FormatToolbarHelpTooltip>
                ) : null}
              </Fragment>
            );
          }
          if (tool.id === 'signatures-act-handwritten') {
            return null;
          }
          if (tool.id === 'spacing-tight') {
            return (
              <Fragment key="list-toolbar">
                {renderListToolbar()}
                <button
                  key={tool.id}
                  type="button"
                  className={`${cdTemplates.formatBtn} ${tool.isActive ? cdTemplates.formatBtnActive : ''}`}
                  title={tool.title}
                  aria-label={tool.title}
                  aria-pressed={tool.ariaPressed}
                  onClick={tool.onClick}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={!isSuperAdmin}
                >
                  {tool.icon}
                </button>
              </Fragment>
            );
          }
          if (tool.id === 'table-2x2' && tool.help) {
            return (
              <Fragment key="table-toolbar">
                <FormatToolbarHelpTooltip
                  title={tool.help.title}
                  steps={tool.help.steps}
                  note={tool.help.note}
                  disabled={!isSuperAdmin}
                  onClick={tool.onClick}
                >
                  {tool.icon}
                </FormatToolbarHelpTooltip>
                {renderTableStructureToolbar()}
              </Fragment>
            );
          }
          if (tool.help) {
            return (
              <FormatToolbarHelpTooltip
                key={tool.id}
                title={tool.help.title}
                steps={tool.help.steps}
                note={tool.help.note}
                disabled={!isSuperAdmin}
                isActive={tool.isActive}
                ariaPressed={tool.ariaPressed}
                wideGlyph={tool.wideGlyph}
                onClick={tool.onClick}
              >
                {tool.icon}
              </FormatToolbarHelpTooltip>
            );
          }
          const formatButton = (
            <button
              key={tool.id}
              type="button"
              className={`${cdTemplates.formatBtn} ${tool.wideGlyph ? cdTemplates.formatBtnWideGlyph : ''} ${tool.isActive ? cdTemplates.formatBtnActive : ''}`}
              title={tool.title}
              aria-label={tool.title}
              aria-pressed={tool.ariaPressed}
              onClick={tool.onClick}
              onMouseDown={(e) => e.preventDefault()}
              disabled={!isSuperAdmin}
            >
              {tool.icon}
            </button>
          );
          if (tool.id !== 'bold') return formatButton;
          return (
            <span
              key={`${tool.id}-with-font-size`}
              className={cdTemplates.formatToolbarInlineGroup}
            >
              <div className={cdTemplates.formatFontSizeWrap} title={FONT_SIZE_TOOLTIP.note}>
                <label
                  className={cdTemplates.formatFontSizeLabel}
                  htmlFor="templates-library-visual-font-size"
                >
                  <span
                    className={cdTemplates.formatFontSizeLabelText}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    пт
                  </span>
                  <select
                    id="templates-library-visual-font-size"
                    className={cdTemplates.formatFontSizeSelect}
                    value={visualFontSizeControl.mixed ? '' : String(visualFontSizeControl.pt)}
                    disabled={!isSuperAdmin || editorMode !== 'visual'}
                    aria-label="Размер шрифта"
                    onMouseDown={() => {
                      captureVisualSelection();
                    }}
                    onChange={(e) => {
                      const next = Number.parseFloat(e.target.value);
                      if (!Number.isFinite(next)) return;
                      applyVisualFontSizeFromToolbar(next);
                    }}
                  >
                    {visualFontSizeControl.mixed ? (
                      <option value="" disabled>
                        —
                      </option>
                    ) : null}
                    {VISUAL_FONT_SIZE_PT_OPTIONS.map((pt) => (
                      <option key={pt} value={String(pt)}>
                        {Number.isInteger(pt) ? pt : pt.toString().replace('.', ',')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {formatButton}
            </span>
          );
        })}
      </div>
      <aside
        className={`${cdTemplates.placeholderPanelTop} ${cdTemplates.templatesLibraryPlaceholderPanel}`}
        aria-label="Плейсхолдеры для вставки"
      >
        <div className={cdTemplates.templatesLibraryPlaceholderHeader}>
          <span className={cdTemplates.templatesLibraryPlaceholderTitle}>Плейсхолдеры</span>
          <button
            type="button"
            className={cdTemplates.templatesLibraryPlaceholderToggleBtn}
            aria-expanded={!placeholdersCollapsed}
            onClick={togglePlaceholdersCollapsed}
          >
            {placeholdersCollapsed ? 'Развернуть' : 'Свернуть'}
          </button>
        </div>
        {!placeholdersCollapsed
          ? PACKAGE_CONTRACT_PLACEHOLDER_GROUPS.map((group) => (
              <div key={group.title} className={cdTemplates.templatesLibraryPlaceholderGroup}>
                <div className={cdTemplates.placeholderGroupTitle}>{group.title}</div>
                <div className={cdTemplates.placeholderChips}>
                  {group.items.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      className={cdTemplates.placeholderChip}
                      title={`Вставить {{${item.path}}}`}
                      onClick={() => insertPlaceholder(item.path)}
                      onMouseDown={(e) => e.preventDefault()}
                      disabled={!isSuperAdmin}
                    >
                      {item.label} <code>{`{{${item.path}}}`}</code>
                    </button>
                  ))}
                </div>
              </div>
            ))
          : null}
      </aside>
    </div>
  );
}
