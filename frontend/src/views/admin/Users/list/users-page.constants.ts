import { ROLES_CONFIG } from '@/views/admin/Settings';
import type { BackendRole } from '@/views/admin/Settings';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const ROLE_LABELS: Record<BackendRole, string> = Object.fromEntries(
  ROLES_CONFIG.map((r) => [r.id, r.label])
) as Record<BackendRole, string>;
