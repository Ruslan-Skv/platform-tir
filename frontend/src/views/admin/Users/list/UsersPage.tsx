'use client';

import { UsersPageView } from './UsersPageView';
import { useUsersPage } from './hooks/useUsersPage';

export type { AdminUser } from './users-page.types';

export function UsersPage() {
  const model = useUsersPage();
  return <UsersPageView model={model} />;
}
