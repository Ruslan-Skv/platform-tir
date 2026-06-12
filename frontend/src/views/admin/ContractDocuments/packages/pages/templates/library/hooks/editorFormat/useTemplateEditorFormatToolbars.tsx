'use client';

import { useMemo } from 'react';

import type { UseTemplatesLibraryEditorFormatParams } from './templateEditorFormatTypes';
import { TemplateEditorFormatCleanupToolbar } from './toolbars/templateEditorFormatCleanupToolbar';
import { TemplateEditorFormatListToolbar } from './toolbars/templateEditorFormatListToolbar';
import { TemplateEditorModeToggle } from './toolbars/templateEditorFormatModeToggle';
import { TemplateEditorFormatTableToolbar } from './toolbars/templateEditorFormatTableToolbar';
import { buildTemplateEditorFormatTools } from './toolbars/templateEditorFormatTools';
import type { TemplateEditorFormatHandlers } from './useTemplateEditorFormatHandlers';
import type { TemplateEditorFormatSelection } from './useTemplateEditorFormatSelection';

export function useTemplateEditorFormatToolbars(
  params: Pick<
    UseTemplatesLibraryEditorFormatParams,
    'isSuperAdmin' | 'editorMode' | 'tableEditActive' | 'switchEditorMode'
  >,
  selection: TemplateEditorFormatSelection,
  handlers: TemplateEditorFormatHandlers
) {
  const { isSuperAdmin, editorMode, tableEditActive, switchEditorMode } = params;

  const formatTools = useMemo(
    () => buildTemplateEditorFormatTools({ selection, handlers }),
    [selection, handlers]
  );

  const renderCleanupToolbar = () => (
    <TemplateEditorFormatCleanupToolbar isSuperAdmin={isSuperAdmin} handlers={handlers} />
  );

  const renderTableStructureToolbar = () => (
    <TemplateEditorFormatTableToolbar
      isSuperAdmin={isSuperAdmin}
      tableEditActive={tableEditActive}
      handlers={handlers}
    />
  );

  const renderListToolbar = () => (
    <TemplateEditorFormatListToolbar isSuperAdmin={isSuperAdmin} handlers={handlers} />
  );

  const editorModeToggle = (
    <TemplateEditorModeToggle editorMode={editorMode} switchEditorMode={switchEditorMode} />
  );

  return {
    editorModeToggle,
    formatTools,
    renderCleanupToolbar,
    renderListToolbar,
    renderTableStructureToolbar,
  };
}
