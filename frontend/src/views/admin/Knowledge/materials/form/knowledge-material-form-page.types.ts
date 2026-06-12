export type KnowledgeMaterialFormStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type KnowledgeMaterialFormPageMessage = {
  type: 'success' | 'error';
  text: string;
};
