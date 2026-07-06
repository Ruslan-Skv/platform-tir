'use client';

import measurementFormStyles from '@/views/admin/CRM/Measurements/form/MeasurementFormPage.module.css';
import { pruneEmptyNoteBlockquotesInEditor } from '@/views/admin/ContractDocuments/core/typography/contractTemplateNoteBlock';

import cdTemplates from '../../../../styles/templates-library.module.css';
import { TemplateEditorZoomControl } from './editor/templateEditorFormatToolbar';
import type { TemplatesLibraryPageModel } from './hooks/useTemplatesLibraryPage';

export type TemplatesLibraryEditorPaneProps = Pick<
  TemplatesLibraryPageModel,
  | 'captureHtmlEditorHeight'
  | 'captureVisualEditorHeight'
  | 'captureVisualSelection'
  | 'commitVisualZoomDraft'
  | 'editorMode'
  | 'editorModeToggle'
  | 'ensureTemplateDraftForEditing'
  | 'handleSyncHtmlWithVisualEditor'
  | 'handleTemplateHtmlFileImport'
  | 'handleTemplateRedo'
  | 'handleTemplateUndo'
  | 'handleVisualEditorKeyDown'
  | 'handleVisualEditorPaste'
  | 'html'
  | 'htmlEditorHeightPx'
  | 'htmlTextareaRef'
  | 'isSuperAdmin'
  | 'refreshInlineFormatActiveState'
  | 'schedulePushTemplateHistoryFromHtml'
  | 'setHtml'
  | 'setVisualDraftHtml'
  | 'setVisualZoomDraft'
  | 'stepVisualZoom'
  | 'syncVisualEditorToHtmlState'
  | 'templateHistoryCanRedo'
  | 'templateHistoryCanUndo'
  | 'templateHtmlFileInputRef'
  | 'visualEditorHeightPx'
  | 'visualEditorRef'
  | 'visualZoomDraft'
  | 'visualZoomPct'
>;

export function TemplatesLibraryEditorPane(props: TemplatesLibraryEditorPaneProps) {
  const {
    editorModeToggle,
    editorMode,
    templateHistoryCanUndo,
    templateHistoryCanRedo,
    handleTemplateUndo,
    handleTemplateRedo,
    isSuperAdmin,
    visualZoomPct,
    visualZoomDraft,
    setVisualZoomDraft,
    commitVisualZoomDraft,
    stepVisualZoom,
    handleSyncHtmlWithVisualEditor,
    templateHtmlFileInputRef,
    handleTemplateHtmlFileImport,
    htmlTextareaRef,
    html,
    ensureTemplateDraftForEditing,
    setHtml,
    setVisualDraftHtml,
    schedulePushTemplateHistoryFromHtml,
    refreshInlineFormatActiveState,
    captureHtmlEditorHeight,
    htmlEditorHeightPx,
    visualEditorRef,
    visualEditorHeightPx,
    handleVisualEditorPaste,
    handleVisualEditorKeyDown,
    captureVisualSelection,
    captureVisualEditorHeight,
    syncVisualEditorToHtmlState,
  } = props;

  return (
    <div className={cdTemplates.contractEditColumn}>
      <div
        className={`${measurementFormStyles.blankSheet} ${cdTemplates.templatesLibraryPaneBlank}`}
      >
        <div
          className={`${cdTemplates.templatesLibraryEditorPaneHead} ${cdTemplates.templatesLibraryEditorPaneHeadMode}`}
        >
          <div className={cdTemplates.templatesLibraryEditorHeadLeading}>
            {editorModeToggle}
            <div className={cdTemplates.templatesLibraryEditorHeadTools}>
              <div
                className={cdTemplates.templatesLibraryHistoryButtons}
                role="group"
                aria-label="История изменений шаблона"
              >
                <button
                  type="button"
                  className={cdTemplates.secondaryBtn}
                  disabled={!isSuperAdmin || !templateHistoryCanUndo}
                  onClick={handleTemplateUndo}
                  title="Отменить последнее изменение (Ctrl+Z). До 100 шагов в HTML и конструкторе."
                  style={{ padding: '2px 8px', minWidth: 32, lineHeight: 1 }}
                  aria-label="Отменить"
                >
                  ↶
                </button>
                <button
                  type="button"
                  className={cdTemplates.secondaryBtn}
                  disabled={!isSuperAdmin || !templateHistoryCanRedo}
                  onClick={handleTemplateRedo}
                  title="Вернуть отменённое (Ctrl+Y). Работает в HTML и визуальном конструкторе."
                  style={{ padding: '2px 8px', minWidth: 32, lineHeight: 1 }}
                  aria-label="Вернуть"
                >
                  ↷
                </button>
              </div>
              {editorMode === 'visual' ? (
                <TemplateEditorZoomControl
                  id="templates-library-visual-zoom"
                  value={visualZoomPct}
                  draft={visualZoomDraft}
                  disabled={!isSuperAdmin}
                  ariaLabel="Масштаб конструктора"
                  title="Масштаб конструктора на экране (не влияет на печать)"
                  onDraftChange={setVisualZoomDraft}
                  onCommit={commitVisualZoomDraft}
                  onStep={stepVisualZoom}
                />
              ) : null}
            </div>
          </div>
          <div className={cdTemplates.templatesLibraryEditorHeadActions}>
            <button
              type="button"
              className={cdTemplates.templatesLibraryEditorHeadActionBtn}
              disabled={!isSuperAdmin}
              title="Загрузить .html / .htm (например, файл «Веб-страница, отфильтрованная» из Word). RTF и .docx сюда не подходят — сначала сохраните как отфильтрованную веб-страницу."
              onClick={() => templateHtmlFileInputRef.current?.click()}
            >
              Импорт из HTML…
            </button>
            <button
              type="button"
              className={cdTemplates.templatesLibraryEditorHeadActionBtn}
              disabled={!isSuperAdmin}
              title="Загрузить HTML из поля в визуальный конструктор"
              onClick={handleSyncHtmlWithVisualEditor}
            >
              HTML → конструктор
            </button>
            <input
              ref={templateHtmlFileInputRef}
              type="file"
              accept=".html,.htm,text/html,application/xhtml+xml"
              style={{ display: 'none' }}
              onChange={(ev) => void handleTemplateHtmlFileImport(ev)}
            />
          </div>
        </div>
        <div
          className={editorMode === 'html' ? undefined : cdTemplates.editorPaneHidden}
          aria-hidden={editorMode !== 'html'}
        >
          <textarea
            id="contract_template_html_source"
            ref={htmlTextareaRef}
            className={`${measurementFormStyles.textarea} ${cdTemplates.contractHtmlTextarea} ${cdTemplates.templatesLibraryHtmlSource}`}
            spellCheck={false}
            aria-label="HTML шаблона договора"
            value={html}
            onChange={(e) => {
              ensureTemplateDraftForEditing();
              const next = e.target.value;
              setHtml(next);
              setVisualDraftHtml(next);
              schedulePushTemplateHistoryFromHtml(next);
            }}
            disabled={!isSuperAdmin}
            tabIndex={editorMode === 'html' ? 0 : -1}
            onSelect={refreshInlineFormatActiveState}
            onKeyUp={refreshInlineFormatActiveState}
            onClick={refreshInlineFormatActiveState}
            onMouseUp={() => {
              captureHtmlEditorHeight();
              refreshInlineFormatActiveState();
            }}
            onTouchEnd={captureHtmlEditorHeight}
            onBlur={captureHtmlEditorHeight}
            style={{ height: htmlEditorHeightPx ? `${htmlEditorHeightPx}px` : undefined }}
          />
        </div>
        <div
          className={editorMode === 'visual' ? undefined : cdTemplates.editorPaneHidden}
          aria-hidden={editorMode !== 'visual'}
        >
          <div
            className={cdTemplates.templatesLibraryVisualEditorZoomHost}
            style={{
              height: visualEditorHeightPx ? `${visualEditorHeightPx}px` : undefined,
            }}
          >
            <div
              className={cdTemplates.templatesLibraryVisualEditorZoomInner}
              style={{ zoom: `${visualZoomPct}%` }}
            >
              <div
                ref={visualEditorRef}
                className={`${measurementFormStyles.textarea} ${cdTemplates.contractHtmlTextarea} ${cdTemplates.visualEditor} ${cdTemplates.visualEditorScrollable} ${cdTemplates.templatesLibraryVisualEditor}`}
                contentEditable={isSuperAdmin && editorMode === 'visual'}
                suppressContentEditableWarning
                onPaste={handleVisualEditorPaste}
                onKeyDown={handleVisualEditorKeyDown}
                onInput={(e) => {
                  ensureTemplateDraftForEditing();
                  const editor = e.currentTarget as HTMLDivElement;
                  pruneEmptyNoteBlockquotesInEditor(editor);
                  const next = editor.innerHTML;
                  setVisualDraftHtml(next);
                  setHtml(next);
                  schedulePushTemplateHistoryFromHtml(next);
                  captureVisualSelection();
                }}
                onKeyUp={captureVisualSelection}
                onMouseUp={() => {
                  captureVisualSelection();
                  captureVisualEditorHeight();
                }}
                onFocus={captureVisualSelection}
                onBlur={() => {
                  if (editorMode !== 'visual') return;
                  syncVisualEditorToHtmlState();
                  captureVisualEditorHeight();
                }}
                onTouchEnd={captureVisualEditorHeight}
                style={{ whiteSpace: 'normal' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
