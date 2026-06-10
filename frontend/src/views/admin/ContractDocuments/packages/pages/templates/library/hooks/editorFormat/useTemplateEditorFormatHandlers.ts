'use client';

import type { UseTemplatesLibraryEditorFormatParams } from './templateEditorFormatTypes';
import { useTemplateEditorFormatDocument } from './useTemplateEditorFormatDocument';
import { useTemplateEditorFormatEditing } from './useTemplateEditorFormatEditing';
import type { TemplateEditorFormatSelection } from './useTemplateEditorFormatSelection';

export type TemplateEditorFormatHandlers = ReturnType<typeof useTemplateEditorFormatHandlers>;

export function useTemplateEditorFormatHandlers(
  params: UseTemplatesLibraryEditorFormatParams,
  selection: TemplateEditorFormatSelection
) {
  const editing = useTemplateEditorFormatEditing(params, selection);
  const document = useTemplateEditorFormatDocument(params, selection);

  return {
    ...editing,
    ...document,
  };
}
