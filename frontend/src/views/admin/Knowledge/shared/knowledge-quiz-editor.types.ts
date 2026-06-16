export type KnowledgeQuizEditorHandle = {
  save: () => Promise<void>;
  isDirty: () => boolean;
};
