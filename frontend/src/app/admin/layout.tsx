'use client';

import { useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { AuthProvider, useAuth } from '@/features/auth';
import { AdminHeader } from '@/widgets/admin/Header/AdminHeader';
import { AdminSidebar } from '@/widgets/admin/Sidebar/AdminSidebar';

import styles from './layout.module.css';

const SIDEBAR_WIDTH_STORAGE_KEY = 'admin-sidebar-width';
const DEFAULT_SIDEBAR_WIDTH = 220;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 400;

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!Number.isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          setSidebarWidth(parsed);
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const handleSidebarWidthChange = (width: number) => {
    const clamped = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
    setSidebarWidth(clamped);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clamped));
    } catch {
      // ignore
    }
  };
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

  const effectiveSidebarWidth = sidebarCollapsed ? 70 : sidebarWidth;

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        width={effectiveSidebarWidth}
        onWidthChange={handleSidebarWidthChange}
        onResizeStart={() => setIsResizing(true)}
        onResizeEnd={() => setIsResizing(false)}
      />
      <div
        className={`${styles.mainArea} ${sidebarCollapsed ? styles.expanded : ''} ${isResizing ? styles.resizing : ''}`}
        style={{ marginLeft: effectiveSidebarWidth }}
      >
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
