/** Подпункт выпадающего меню (из API) */
export interface NavigationDropdownSubItemApi {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
}

/** Пункт выпадающего меню (из API) */
export interface NavigationDropdownItemApi {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
  icon: string | null;
  submenu: NavigationDropdownSubItemApi[];
}

export interface NavigationItem {
  name: string;
  label?: string;
  href?: string;
  hasDropdown?: boolean;
  /** Устаревшее: использовалось для выбора меню из констант; теперь контент в dropdownItems из API */
  category?: string;
  /** Вложенное меню из API (приоритет над константами) */
  dropdownItems?: NavigationDropdownItemApi[];
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
