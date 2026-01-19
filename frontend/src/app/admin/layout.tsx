'use client';

import { useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { AuthProvider, useAuth } from '@/features/auth';
import { AdminHeader } from '@/widgets/admin/Header/AdminHeader';
import { AdminSidebar } from '@/widgets/admin/Sidebar/AdminSidebar';

import styles from './layout.module.css';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // Skip redirect for login page
    if (isLoginPage) return;

    // Wait for loading to complete
    if (isLoading) return;

    // Redirect to login if not authenticated or not admin
    if (!isAuthenticated || !isAdmin) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isAdmin, isLoading, isLoginPage, router]);

  // Show login page without admin layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  // Don't render admin layout if not authenticated
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className={`${styles.mainArea} ${sidebarCollapsed ? styles.expanded : ''}`}>
        <AdminHeader />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthProvider>
  );
}
