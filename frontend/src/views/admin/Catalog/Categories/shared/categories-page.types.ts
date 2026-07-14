export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  isActive: boolean;
  sizesRequired?: boolean;
  showChildCategoryFilters?: boolean;
  order: number;
  parentId: string | null;
  children?: Category[];
  _count?: {
    products: number;
    totalProducts?: number;
  };
};

export type NewCategoryForm = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  icon: string;
  image: string;
};

export type CreateMessage = {
  type: 'success' | 'error';
  text: string;
};

export type FlatCategoryOption = {
  id: string;
  name: string;
};
