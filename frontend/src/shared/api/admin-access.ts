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

export interface ResourcePermissionItem {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  permission: 'VIEW' | 'EDIT';
  createdAt: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

export async function getAdminAccessResources(): Promise<AdminResourceItem[]> {
  const res = await fetch(`${API_URL}/admin/access/resources`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список ресурсов');
  return res.json();
}

export async function getAdminAccessUsers(): Promise<AdminUserItem[]> {
  const res = await fetch(`${API_URL}/admin/access/users`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список пользователей');
  return res.json();
}

export async function getResourcePermissions(
  resourceId: string
): Promise<ResourcePermissionItem[]> {
  const res = await fetch(
    `${API_URL}/admin/access/resources/${encodeURIComponent(resourceId)}/permissions`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error('Не удалось загрузить доступ');
  return res.json();
}

export async function setResourcePermission(
  resourceId: string,
  userId: string,
  permission: 'VIEW' | 'EDIT'
): Promise<ResourcePermissionItem[]> {
  const res = await fetch(
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
): Promise<ResourcePermissionItem[]> {
  const res = await fetch(
    `${API_URL}/admin/access/resources/${encodeURIComponent(resourceId)}/permissions/${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error('Не удалось удалить доступ');
  return res.json();
}
