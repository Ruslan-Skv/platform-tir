import type { KnowledgeMaterialType } from '@/shared/api/admin-knowledge';

export type PageMessage = {
  type: 'success' | 'error';
  text: string;
};

export type DeleteTarget = {
  type: 'material' | 'category' | 'module';
  id: string;
  name: string;
};

export type TypeFilterOption = {
  value: KnowledgeMaterialType | '';
  label: string;
};
