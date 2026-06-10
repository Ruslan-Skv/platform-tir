'use client';

import type { UseTemplatesLibraryEditorFormatParams } from './editorFormat/templateEditorFormatTypes';
import { useTemplateEditorFormatHandlers } from './editorFormat/useTemplateEditorFormatHandlers';
import { useTemplateEditorFormatSelection } from './editorFormat/useTemplateEditorFormatSelection';
import { useTemplateEditorFormatToolbars } from './editorFormat/useTemplateEditorFormatToolbars';

export type { UseTemplatesLibraryEditorFormatParams } from './editorFormat/templateEditorFormatTypes';

export function useTemplatesLibraryEditorFormat(params: UseTemplatesLibraryEditorFormatParams) {
  const selection = useTemplateEditorFormatSelection(params);
  const handlers = useTemplateEditorFormatHandlers(params, selection);
  const toolbars = useTemplateEditorFormatToolbars(
    {
      isSuperAdmin: params.isSuperAdmin,
      editorMode: params.editorMode,
      tableEditActive: params.tableEditActive,
      switchEditorMode: params.switchEditorMode,
    },
    selection,
    handlers
  );

  return {
    ...selection,
    ...handlers,
    ...toolbars,
  };
}
