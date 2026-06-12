'use client';

import Link from 'next/link';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import { PACKAGE_CONTRACT_PLACEHOLDER_GROUPS } from '../../form/contractPlaceholders';
import type { useContractTemplateEditor } from '../../hooks/document/useContractTemplateEditor';

export type PackageContractTemplateEditorPaneProps = {
  editor: ReturnType<typeof useContractTemplateEditor>;
  renderedDoc: string;
  excelMessage: string | null;
};

export function PackageContractTemplateEditorPane({
  editor,
  renderedDoc,
  excelMessage,
}: PackageContractTemplateEditorPaneProps) {
  const {
    contractDocView,
    setContractDocView,
    contractHtmlTextareaRef,
    contractTemplateSource,
    contractTabTemplates,
    selectedContractTemplateId,
    formatToolbarLevel,
    setFormatToolbarLevel,
    formatToolbarQuery,
    setFormatToolbarQuery,
    showAllFormatTools,
    setShowAllFormatTools,
    visibleTools,
    templateDraftTitle,
    setTemplateDraftTitle,
    editingTemplateId,
    templateSaving,
    handleContractTemplateChange,
    handleEditTemplateSelect,
    handleSaveTemplateDraft,
    handleCreateTemplate,
    handleDeleteTemplate,
    handleSetDefaultTemplate,
    handleResetContractTemplate,
    insertContractPlaceholder,
  } = editor;

  return (
    <>
      <div
        className={`${cdDocPreview.docToolbar} ${cdDocPreview.blockImport}`}
        style={{ flexDirection: 'column', alignItems: 'stretch' }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <label className={cdEstimateTab.field} style={{ minWidth: 280 }}>
            <span>Шаблон договора</span>
            <select
              value={editingTemplateId || selectedContractTemplateId}
              onChange={(e) => handleEditTemplateSelect(e.target.value)}
            >
              {contractTabTemplates.length === 0 ? (
                <option value="">— шаблоны не настроены —</option>
              ) : null}
              {contractTabTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title}
                  {tpl.isDefault ? ' (по умолчанию)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className={cdEstimateTab.field} style={{ minWidth: 220, flex: '1 1 200px' }}>
            <span>Название шаблона</span>
            <input
              type="text"
              value={templateDraftTitle}
              onChange={(e) => setTemplateDraftTitle(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={cdWorkspace.primaryBtn}
            disabled={templateSaving}
            onClick={() => void handleSaveTemplateDraft()}
          >
            {templateSaving ? 'Сохранение…' : 'Сохранить шаблон'}
          </button>
          <button
            type="button"
            className={cdWorkspace.secondaryBtn}
            onClick={() => handleCreateTemplate('blank')}
          >
            + Пустой
          </button>
          <button
            type="button"
            className={cdWorkspace.secondaryBtn}
            onClick={() => handleCreateTemplate('copy')}
          >
            + Копия
          </button>
          <button
            type="button"
            className={cdWorkspace.secondaryBtn}
            disabled={!editingTemplateId}
            onClick={() => void handleDeleteTemplate()}
          >
            В архив
          </button>
          <button
            type="button"
            className={cdWorkspace.secondaryBtn}
            disabled={!editingTemplateId}
            onClick={() => void handleSetDefaultTemplate()}
          >
            По умолчанию
          </button>
          <button
            type="button"
            className={cdWorkspace.secondaryBtn}
            onClick={handleResetContractTemplate}
          >
            Сбросить
          </button>
          <Link className={cdWorkspace.secondaryBtn} href="/admin/contract-documents/templates">
            Библиотека шаблонов
          </Link>
          <button
            type="button"
            className={
              contractDocView === 'preview'
                ? cdDocPreview.contractModeBtnActive
                : cdDocPreview.contractModeBtn
            }
            onClick={() => setContractDocView('preview')}
          >
            Только препросмотр
          </button>
          <button
            type="button"
            className={
              contractDocView === 'edit'
                ? cdDocPreview.contractModeBtnActive
                : cdDocPreview.contractModeBtn
            }
            onClick={() => setContractDocView('edit')}
          >
            Редактировать HTML
          </button>
        </div>
        {excelMessage ? <p className={cdDocPreview.hint}>{excelMessage}</p> : null}
      </div>

      {contractDocView === 'edit' ? (
        <>
          <div className={`${cdDocPreview.contractTopTools} ${cdDocPreview.blockTools}`}>
            <div className={cdDocPreview.contractEditorMain}>
              <div className={cdDocPreview.formatLevelBar}>
                <button
                  type="button"
                  className={
                    formatToolbarLevel === 'basic'
                      ? cdDocPreview.formatLevelBtnActive
                      : cdDocPreview.formatLevelBtn
                  }
                  onClick={() => setFormatToolbarLevel('basic')}
                >
                  Базовые
                </button>
                <button
                  type="button"
                  className={
                    formatToolbarLevel === 'advanced'
                      ? cdDocPreview.formatLevelBtnActive
                      : cdDocPreview.formatLevelBtn
                  }
                  onClick={() => setFormatToolbarLevel('advanced')}
                >
                  Расширенные
                </button>
              </div>
              <div className={cdDocPreview.formatToolbarTopRow}>
                <input
                  type="text"
                  value={formatToolbarQuery}
                  onChange={(e) => setFormatToolbarQuery(e.target.value)}
                  placeholder="Поиск инструмента…"
                  className={cdDocPreview.formatSearchInput}
                />
                <button
                  type="button"
                  className={
                    showAllFormatTools
                      ? cdDocPreview.formatLevelBtnActive
                      : cdDocPreview.formatLevelBtn
                  }
                  onClick={() => setShowAllFormatTools((v) => !v)}
                >
                  {showAllFormatTools ? 'Только частые' : 'Показать все'}
                </button>
              </div>
              <div className={cdDocPreview.formatToolbar}>
                {visibleTools.map((tool) => (
                  <button
                    key={tool.label}
                    type="button"
                    className={cdDocPreview.formatBtn}
                    onClick={tool.onClick}
                  >
                    {tool.label}
                  </button>
                ))}
                {visibleTools.length === 0 ? (
                  <span className={cdDocPreview.hint} style={{ margin: 0 }}>
                    По запросу ничего не найдено.
                  </span>
                ) : null}
              </div>
            </div>
            <aside
              className={cdDocPreview.placeholderPanelTop}
              aria-label="Плейсхолдеры для вставки"
            >
              {PACKAGE_CONTRACT_PLACEHOLDER_GROUPS.map((group) => (
                <div key={group.title}>
                  <div className={cdDocPreview.placeholderGroupTitle}>{group.title}</div>
                  <div className={cdDocPreview.placeholderChips}>
                    {group.items.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        className={cdDocPreview.placeholderChip}
                        title={`Вставить {{${item.path}}}`}
                        onClick={() => insertContractPlaceholder(item.path)}
                      >
                        {item.label} <code>{`{{${item.path}}}`}</code>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </aside>
          </div>

          <p className={cdDocPreview.hint}>
            Нажмите на поле слева — в шаблон вставится <code>{'{{путь}}'}</code> в позицию курсора.
            Панель форматирования разделена на уровни: «Базовые» и «Расширенные», есть поиск по
            названию кнопок и переключатель «Только частые / Показать все». Разрешены теги HTML (
            <code>&lt;p&gt;</code>, <code>&lt;h1&gt;</code>, <code>&lt;table&gt;</code> и т.д.).
            После правок нажмите «Сохранить шаблон».
          </p>

          <div className={cdDocPreview.contractLiveGrid}>
            <div className={cdDocPreview.contractEditColumn}>
              <label className={cdDocPreview.contractEditorLabel} htmlFor="contract_html_source">
                HTML шаблона договора
              </label>
              <textarea
                id="contract_html_source"
                ref={contractHtmlTextareaRef}
                className={cdDocPreview.contractHtmlTextarea}
                spellCheck={false}
                value={contractTemplateSource}
                onChange={(e) => handleContractTemplateChange(e.target.value)}
              />
            </div>
            <div className={cdDocPreview.contractPreviewColumn}>
              <h3 className={cdDocPreview.previewBlockTitle}>Предпросмотр с подстановкой данных</h3>
              <div
                className={`${cdDocPreview.docPane} ${cdEstimateTab.docPane} ${cdEstimateTab.previewResizable}`}
              >
                <div dangerouslySetInnerHTML={{ __html: renderedDoc }} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={`${cdDocPreview.docPane} ${cdEstimateTab.docPane}`}>
          <div dangerouslySetInnerHTML={{ __html: renderedDoc }} />
        </div>
      )}
    </>
  );
}
