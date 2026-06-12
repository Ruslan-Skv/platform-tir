import type { DropdownItemForm, NavItemForm, SubItemForm } from './navigation-section-page.types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const EMPTY_NAV_ITEM_FORM: NavItemForm = {
  name: '',
  href: '#',
  hasDropdown: false,
  isActive: true,
};

export const EMPTY_EDIT_FORM: NavItemForm = {
  name: '',
  href: '',
  hasDropdown: false,
  isActive: true,
};

export const EMPTY_DROPDOWN_ITEM_FORM: DropdownItemForm = {
  name: '',
  href: '#',
  icon: '',
};

export const EMPTY_SUB_ITEM_FORM: SubItemForm = {
  name: '',
  href: '#',
};
