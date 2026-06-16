export type KnowledgeMaterialFormStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type KnowledgeMaterialSubmitAction = 'save' | 'publish' | 'unpublish';

export type KnowledgeMaterialFormPageMessage = {
  type: 'success' | 'error';
  text: string;
};
