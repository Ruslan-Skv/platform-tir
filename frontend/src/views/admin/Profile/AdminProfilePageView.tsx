'use client';

import { useRouter } from 'next/navigation';

import { AdminProfileModal } from '@/features/admin/profile';

/** Deep-link `/admin/profile`: открывает ту же модалку и при закрытии уходит в админку. */
export function AdminProfilePageView() {
  const router = useRouter();

  return (
    <AdminProfileModal
      isOpen
      onClose={() => {
        router.replace('/admin');
      }}
    />
  );
}
