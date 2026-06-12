export type CategoryEditFormData = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  icon: string;
  image: string;
  isActive: boolean;
  order: number;
};

export type CategoryEditPageMessage = {
  type: 'success' | 'error';
  text: string;
};
