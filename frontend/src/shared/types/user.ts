export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CONTENT_MANAGER'
  | 'MODERATOR'
  | 'SUPPORT'
  | 'PARTNER'
  | 'MANAGER'
  | 'TECHNOLOGIST'
  | 'BRIGADIER'
  | 'LEAD_SPECIALIST_FURNITURE'
  | 'LEAD_SPECIALIST_WINDOWS_DOORS'
  | 'SURVEYOR'
  | 'DRIVER'
  | 'INSTALLER'
  | 'USER'
  | 'GUEST';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
