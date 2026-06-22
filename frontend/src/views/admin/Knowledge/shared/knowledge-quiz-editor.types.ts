export type KnowledgeQuizEditorHandle = {
  save: (materialId?: string) => Promise<void>;
  isDirty: () => boolean;
};
