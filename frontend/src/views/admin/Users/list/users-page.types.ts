import type { BackendRole } from '@/views/admin/Settings';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: BackendRole;
  isActive: boolean;
  employeeCode?: string | null;
  createdAt: string;
  updatedAt: string;
}
