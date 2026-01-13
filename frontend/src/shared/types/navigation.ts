export interface NavigationItem {
  name: string;
  label?: string;
  href?: string;
  hasDropdown?: boolean;
  category: string;
  dropdownItems?: Array<{
    name: string;
    label: string;
    href: string;
  }>;
}

export interface DropdownSubItem {
  name: string;
  href: string;
  productType: string;
}

export interface DropdownItem {
  name: string;
  href: string;
  productType: string;
  hasSubmenu?: boolean;
  submenu?: DropdownSubItem[];
  icon?: string; // Имя иконки из heroicons или путь к изображению
}

export interface DropdownMenu {
  category: string;
  image: string;
  items: DropdownItem[];
}

export type DropdownMenus = Record<string, DropdownMenu>;
