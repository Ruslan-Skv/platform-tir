import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface AdminResourceItem {
  id: string;
  label: string;
  path: string;
}

export interface ResourcePermissionUserItem {
  type: 'user';
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role?: string;
  permission: 'VIEW' | 'EDIT' | 'DENIED';
  createdAt: string;
}

export interface ResourcePermissionRoleItem {
  type: 'role';
  id: string;
  role: string;
  permission: 'VIEW' | 'EDIT' | 'DENIED';
  createdAt: string;
}

export type RoleAccessSource =
  | 'super_admin'
  | 'default'
  | 'role_override'
  | 'role_denied'
  | 'inherited_denied'
  | 'none';

export type EffectiveAccess = 'EDIT' | 'VIEW' | 'NONE' | 'DENIED';

export interface RoleAccessOverviewItem {
  role: string;
  effective: EffectiveAccess;
  source: RoleAccessSource;
  overridePermission?: 'VIEW' | 'EDIT' | 'DENIED';
  hasExplicitOverride: boolean;
}

export interface MyAccessibleResourceItem {
  id: string;
  permission: 'VIEW' | 'EDIT';
}

export interface ResourcePermissionsResponse {
  users: ResourcePermissionUserItem[];
  roles: ResourcePermissionRoleItem[];
  roleOverview: RoleAccessOverviewItem[];
}

/** @deprecated Используйте ResourcePermissionsResponse */
export type ResourcePermissionItem = ResourcePermissionUserItem;

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

export async function getAdminAccessResources(): Promise<AdminResourceItem[]> {
  const res = await apiFetch(`${API_URL}/admin/access/resources`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список ресурсов');
  return res.json();
}

export async function getAdminAccessUsers(): Promise<AdminUserItem[]> {
  const res = await apiFetch(`${API_URL}/admin/access/users`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список пользователей');
  return res.json();
}

export async function getResourcePermissions(
  resourceId: string
): Promise<ResourcePermissionsResponse> {
  const res = await apiFetch(
    `${API_URL}/admin/access/resources/${encodeURIComponent(resourceId)}/permissions`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error('Не удалось загрузить доступ');
  return res.json();
}

export async function getMyAccessibleResources(): Promise<MyAccessibleResourceItem[]> {
  const res = await apiFetch(`${API_URL}/admin/access/my-resources`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список доступных разделов');
  return res.json();
}

export async function setResourcePermission(
  resourceId: string,
  userId: string,
  permission: 'VIEW' | 'EDIT' | 'DENIED'
): Promise<ResourcePermissionsResponse> {
  const res = await apiFetch(
    `${API_URL}/admin/access/resources/${encodeURIComponent(resourceId)}/permissions`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify({ userId, permission }),
    }
  );
  if (!res.ok) throw new Error('Не удалось сохранить доступ');
  return res.json();
}

export async function revokeResourcePermission(
  resourceId: string,
  userId: string
): Promise<ResourcePermissionsResponse> {
  const res = await apiFetch(
    `${API_URL}/admin/access/resources/${encodeURIComponent(resourceId)}/permissions/${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error('Не удалось удалить доступ');
  return res.json();
}

export interface AdminRoleItem {
  id: string;
  label: string;
}

export async function getAdminAccessRoles(): Promise<AdminRoleItem[]> {
  const res = await apiFetch(`${API_URL}/admin/access/roles`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список ролей');
  return res.json();
}

export async function setRolePermission(
  resourceId: string,
  role: string,
  permission: 'VIEW' | 'EDIT' | 'DENIED'
): Promise<ResourcePermissionsResponse> {
  const res = await apiFetch(
    `${API_URL}/admin/access/resources/${encodeURIComponent(resourceId)}/role-permissions`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify({ role, permission }),
    }
  );
  if (!res.ok) throw new Error('Не удалось сохранить доступ по роли');
  return res.json();
}

export async function revokeRolePermission(
  resourceId: string,
  role: string
): Promise<ResourcePermissionsResponse> {
  const res = await apiFetch(
    `${API_URL}/admin/access/resources/${encodeURIComponent(resourceId)}/role-permissions/${encodeURIComponent(role)}`,
    { method: 'DELETE', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error('Не удалось удалить доступ по роли');
  return res.json();
}
