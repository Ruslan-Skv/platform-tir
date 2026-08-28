import { buildAdminSidebarBootstrapScript } from '@/shared/lib/admin-sidebar-layout';

import { AdminLayoutClient } from './AdminLayoutClient';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: buildAdminSidebarBootstrapScript(),
        }}
      />
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </>
  );
}
