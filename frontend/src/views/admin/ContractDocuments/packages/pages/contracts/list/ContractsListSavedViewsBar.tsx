'use client';

import { useState } from 'react';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import type { ContractsListSavedView } from './contractsListSavedViews';

type ContractsListSavedViewsBarProps = {
  loading: boolean;
  views: ContractsListSavedView[];
  activeViewId: string | null;
  draftTitle: string;
  onDraftTitleChange: (value: string) => void;
  saveOpen: boolean;
  onSaveOpenChange: (open: boolean) => void;
  suggestedTitles: string[];
  onApplyView: (id: string) => void;
  onOpenSaveComposer: () => void;
  onSaveCurrentView: () => void;
  onDeleteView: (id: string) => void;
  onRenameView: (id: string, title: string) => void;
};

export function ContractsListSavedViewsBar({
  loading,
  views,
  activeViewId,
  draftTitle,
  onDraftTitleChange,
  saveOpen,
  onSaveOpenChange,
  suggestedTitles,
  onApplyView,
  onOpenSaveComposer,
  onSaveCurrentView,
  onDeleteView,
  onRenameView,
}: ContractsListSavedViewsBarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const startRename = (view: ContractsListSavedView) => {
    setRenamingId(view.id);
    setRenameDraft(view.title);
  };

  const commitRename = () => {
    if (!renamingId) return;
    onRenameView(renamingId, renameDraft);
    setRenamingId(null);
    setRenameDraft('');
  };

  return (
    <div className={cdHub.contractsListSavedViews}>
      <div
        className={cdHub.contractsListChipRow}
        role="group"
        aria-label="Сохранённые представления"
      >
        <span className={cdHub.contractsListChipRowLabel}>Виды</span>
        {views.length === 0 ? (
          <span className={cdHub.contractsListSavedViewsEmpty}>
            Пока нет сохранённых представлений
          </span>
        ) : (
          views.map((view) => {
            const active = activeViewId === view.id;
            if (renamingId === view.id) {
              return (
                <span key={view.id} className={cdHub.contractsListSavedViewEdit}>
                  <input
                    type="text"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    disabled={loading}
                    className={cdHub.contractsListSavedViewInput}
                    aria-label="Новое название представления"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitRename();
                      }
                      if (e.key === 'Escape') {
                        setRenamingId(null);
                        setRenameDraft('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={cdHub.contractsListSavedViewAction}
                    disabled={loading || !renameDraft.trim()}
                    onClick={commitRename}
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    className={cdHub.contractsListSavedViewAction}
                    disabled={loading}
                    onClick={() => {
                      setRenamingId(null);
                      setRenameDraft('');
                    }}
                  >
                    Отмена
                  </button>
                </span>
              );
            }
            return (
              <span key={view.id} className={cdHub.contractsListSavedViewChipWrap}>
                <button
                  type="button"
                  disabled={loading}
                  className={`${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`}
                  onClick={() => onApplyView(view.id)}
                  title={`Применить: ${view.title}`}
                >
                  {view.title}
                </button>
                <button
                  type="button"
                  className={cdHub.contractsListSavedViewMini}
                  disabled={loading}
                  title="Переименовать"
                  aria-label={`Переименовать «${view.title}»`}
                  onClick={() => startRename(view)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={cdHub.contractsListSavedViewMini}
                  disabled={loading}
                  title="Удалить"
                  aria-label={`Удалить «${view.title}»`}
                  onClick={() => {
                    if (window.confirm(`Удалить представление «${view.title}»?`)) {
                      onDeleteView(view.id);
                    }
                  }}
                >
                  ×
                </button>
              </span>
            );
          })
        )}
        {!saveOpen ? (
          <button
            type="button"
            disabled={loading}
            className={cdHub.contractsListSavedViewsSaveBtn}
            onClick={onOpenSaveComposer}
          >
            Сохранить текущее…
          </button>
        ) : null}
      </div>

      {saveOpen ? (
        <div className={cdHub.contractsListSavedViewsSaveRow}>
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => onDraftTitleChange(e.target.value)}
            disabled={loading}
            placeholder="Например: Мои черновики / Производство окон"
            className={cdHub.contractsListSavedViewInput}
            aria-label="Название представления"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSaveCurrentView();
              }
              if (e.key === 'Escape') {
                onSaveOpenChange(false);
                onDraftTitleChange('');
              }
            }}
          />
          <button
            type="button"
            className={cdHub.contractsListSavedViewsSaveBtn}
            disabled={loading || !draftTitle.trim()}
            onClick={onSaveCurrentView}
          >
            Сохранить
          </button>
          <button
            type="button"
            className={cdHub.contractsListSavedViewAction}
            disabled={loading}
            onClick={() => {
              onSaveOpenChange(false);
              onDraftTitleChange('');
            }}
          >
            Отмена
          </button>
        </div>
      ) : null}

      {saveOpen && suggestedTitles.length > 0 ? (
        <div className={cdHub.contractsListChipRow} role="group" aria-label="Шаблоны названия">
          <span className={cdHub.contractsListChipRowLabel}>Шаблоны</span>
          {suggestedTitles.map((title) => (
            <button
              key={title}
              type="button"
              disabled={loading}
              className={`${cdHub.contractsListChip}${draftTitle.trim() === title ? ` ${cdHub.contractsListChipActive}` : ''}`}
              onClick={() => onDraftTitleChange(title)}
            >
              {title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
