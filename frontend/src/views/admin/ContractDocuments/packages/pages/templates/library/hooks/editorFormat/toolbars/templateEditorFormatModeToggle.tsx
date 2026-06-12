'use client';

import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import type { TemplateEditorFormatToolbarUiProps } from './templateEditorFormatTools';

export function TemplateEditorModeToggle({
  editorMode,
  switchEditorMode,
}: Pick<TemplateEditorFormatToolbarUiProps, 'editorMode' | 'switchEditorMode'>) {
  return (
    <div
      className={`${cdTemplates.formatLevelBar} ${cdTemplates.templatesLibraryEditorModeToggle}`}
      role="group"
      aria-label="Режим редактора шаблона"
    >
      <button
        type="button"
        className={
          editorMode === 'html' ? cdTemplates.formatLevelBtnActive : cdTemplates.formatLevelBtn
        }
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => switchEditorMode('html')}
      >
        HTML
      </button>
      <button
        type="button"
        className={
          editorMode === 'visual' ? cdTemplates.formatLevelBtnActive : cdTemplates.formatLevelBtn
        }
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => switchEditorMode('visual')}
      >
        Визуальный конструктор
      </button>
    </div>
  );
}
