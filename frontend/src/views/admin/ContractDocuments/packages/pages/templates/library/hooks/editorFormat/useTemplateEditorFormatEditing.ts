'use client';

import { pickTemplateEditorFormatDeps } from './templateEditorFormatDeps';
import type { UseTemplatesLibraryEditorFormatParams } from './templateEditorFormatTypes';
import { useTemplateEditorFormatLists } from './useTemplateEditorFormatLists';
import type { TemplateEditorFormatSelection } from './useTemplateEditorFormatSelection';
import { useTemplateEditorFormatTypography } from './useTemplateEditorFormatTypography';

export type TemplateEditorFormatEditing = ReturnType<typeof useTemplateEditorFormatEditing>;

export function useTemplateEditorFormatEditing(
  params: UseTemplatesLibraryEditorFormatParams,
  selection: TemplateEditorFormatSelection
) {
  const deps = pickTemplateEditorFormatDeps(params, selection);
  const typography = useTemplateEditorFormatTypography(deps);
  const lists = useTemplateEditorFormatLists(deps);

  return {
    ...typography,
    ...lists,
  };
}
