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
  /** Показывать дочерние категории в блоке фильтров на публичной странице категории. */
  showChildCategoryFilters: boolean;
  order: number;
};

export type CategoryEditPageMessage = {
  type: 'success' | 'error';
  text: string;
};
