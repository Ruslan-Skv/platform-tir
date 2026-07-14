export type CategoryEditFormData = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  icon: string;
  image: string;
  isActive: boolean;
  /** Размеры обязательны при создании/редактировании товара в этой категории. */
  sizesRequired: boolean;
  order: number;
};

export type CategoryEditPageMessage = {
  type: 'success' | 'error';
  text: string;
};
