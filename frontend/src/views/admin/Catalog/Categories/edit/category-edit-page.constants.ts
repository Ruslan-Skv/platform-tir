import type { CategoryEditFormData } from './category-edit-page.types';

export const INITIAL_CATEGORY_EDIT_FORM: CategoryEditFormData = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  icon: '',
  image: '',
  isActive: true,
  sizesRequired: true,
  order: 0,
};
