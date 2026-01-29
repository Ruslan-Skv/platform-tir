export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CONTENT_MANAGER'
  | 'MODERATOR'
  | 'SUPPORT'
  | 'PARTNER'
  | 'USER'
  | 'GUEST';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
