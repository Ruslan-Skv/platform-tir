export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'content_manager'
  | 'moderator'
  | 'support'
  | 'partner'
  | 'user'
  | 'guest';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
