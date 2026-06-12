import type { UseTemplatesLibraryMutationsParams } from './mutations/templatesLibraryMutationsTypes';
import { useTemplatesLibraryMutationsArchive } from './mutations/useTemplatesLibraryMutationsArchive';
import { useTemplatesLibraryMutationsAutosave } from './mutations/useTemplatesLibraryMutationsAutosave';
import { useTemplatesLibraryMutationsExport } from './mutations/useTemplatesLibraryMutationsExport';
import { useTemplatesLibraryMutationsPersist } from './mutations/useTemplatesLibraryMutationsPersist';
import { useTemplatesLibraryMutationsSelection } from './mutations/useTemplatesLibraryMutationsSelection';
import { useTemplatesLibraryMutationsTrash } from './mutations/useTemplatesLibraryMutationsTrash';

export type { UseTemplatesLibraryMutationsParams } from './mutations/templatesLibraryMutationsTypes';

export function useTemplatesLibraryMutations(params: UseTemplatesLibraryMutationsParams) {
  const persistApi = useTemplatesLibraryMutationsPersist(params);
  const { handleSaveNow } = useTemplatesLibraryMutationsAutosave(params, persistApi);
  const selectionApi = useTemplatesLibraryMutationsSelection(params, persistApi);
  const trashApi = useTemplatesLibraryMutationsTrash(params, persistApi, selectionApi);
  const archiveApi = useTemplatesLibraryMutationsArchive(params, persistApi, selectionApi);
  const exportApi = useTemplatesLibraryMutationsExport(params);

  return {
    ...selectionApi,
    ...trashApi,
    ...archiveApi,
    ...exportApi,
    handleSaveNow,
  };
}
