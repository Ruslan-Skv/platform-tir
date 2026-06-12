export type CatalogCategoryFromApi = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image: string | null;
  isActive: boolean;
  parentId: string | null;
  children?: CatalogCategoryFromApi[];
  _count?: { products: number; totalProducts?: number };
};

export type DropdownSubItemApi = {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
};

export type DropdownItemApi = {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
  icon: string | null;
  submenu: DropdownSubItemApi[];
};

export type NavItem = {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
  hasDropdown: boolean;
  isActive?: boolean;
  dropdownItems?: DropdownItemApi[];
};

export type PageMessage = {
  type: 'success' | 'error';
  text: string;
};

export type NavItemForm = {
  name: string;
  href: string;
  hasDropdown: boolean;
  isActive: boolean;
};

export type DropdownItemForm = {
  name: string;
  href: string;
  icon: string;
};

export type SubItemForm = {
  name: string;
  href: string;
};

export type DeleteModalState = {
  type: 'nav' | 'dropdown' | 'sub';
  id: string;
  name: string;
  warning?: string;
};
