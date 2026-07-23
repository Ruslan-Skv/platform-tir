'use client';

import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';

import { usePathname, useRouter } from 'next/navigation';

import { AdminWebPushManager } from '@/features/admin-push';
import { AdminSectionAccessShell } from '@/features/admin/components/AdminSectionAccessShell';
import { AdminAccessibleResourcesProvider } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import { WorkDayGate, WorkDayProvider } from '@/features/admin/work-day';
import { AuthProvider, useAuth } from '@/features/auth';
import { getOrCreateStore } from '@/features/theme';
import { QueryProvider } from '@/shared/lib/react-query/QueryProvider';
import { AdminHeader } from '@/widgets/admin/Header/AdminHeader';
import { AdminPresenceHeartbeat } from '@/widgets/admin/Header/AdminPresenceHeartbeat';
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);

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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const syncMobileLayout = () => setIsMobileLayout(mediaQuery.matches);
    syncMobileLayout();
    mediaQuery.addEventListener('change', syncMobileLayout);
    return () => mediaQuery.removeEventListener('change', syncMobileLayout);
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
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Сброс leftover scroll-lock Headless UI (Modal) и любых inline overflow на html/body.
  useEffect(() => {
    if (isLoginPage) return;

    const unlock = () => {
      const openDialog = document.querySelector(
        '[role="dialog"][data-open], [role="dialog"][data-headlessui-state*="open"]'
      );
      if (openDialog) return;
      const root = document.documentElement;
      const body = document.body;
      if (root.style.overflow === 'hidden') root.style.removeProperty('overflow');
      if (root.style.paddingRight) root.style.removeProperty('padding-right');
      if (body.style.overflow === 'hidden') body.style.removeProperty('overflow');
      if (body.style.paddingRight) body.style.removeProperty('padding-right');
    };

    unlock();
    const obs = new MutationObserver(unlock);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    obs.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    return () => obs.disconnect();
  }, [isLoginPage, pathname]);

  useEffect(() => {
    if (!isMobileLayout) {
      setMobileSidebarOpen(false);
    }
  }, [isMobileLayout]);

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

  const authReady = !isLoading && isAuthenticated && isAdmin;

  // Не авторизован — короткий спиннер до редиректа на login (без оболочки)
  if (!isLoading && (!isAuthenticated || !isAdmin)) {
    return (
      <div className={styles.loadingContainer} aria-busy="true" aria-label="Загрузка">
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  const effectiveSidebarWidth = sidebarCollapsed ? 70 : sidebarWidth;
  const mainAreaMarginLeft = isMobileLayout ? 0 : effectiveSidebarWidth;
  const sidebarCollapsedForView = isMobileLayout ? false : sidebarCollapsed;

  const handleSidebarToggle = () => {
    if (isMobileLayout) {
      setMobileSidebarOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((collapsed) => !collapsed);
  };

  return (
    <AdminAccessibleResourcesProvider>
      <WorkDayProvider>
        <AdminWebPushManager />
        <div className={styles.adminLayout} data-admin-shell>
          <AdminSidebar
            collapsed={sidebarCollapsedForView}
            onToggle={handleSidebarToggle}
            width={effectiveSidebarWidth}
            onWidthChange={handleSidebarWidthChange}
            onResizeStart={() => setIsResizing(true)}
            onResizeEnd={() => setIsResizing(false)}
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
          <div
            className={`${styles.mainArea} ${sidebarCollapsed ? styles.expanded : ''} ${isResizing ? styles.resizing : ''}`}
            style={{
              marginLeft: mainAreaMarginLeft,
              ['--admin-main-offset-left' as string]: `${mainAreaMarginLeft}px`,
            }}
          >
            <AdminPresenceHeartbeat />
            <AdminHeader
              onMobileMenuOpen={() => setMobileSidebarOpen((open) => !open)}
              mobileMenuOpen={mobileSidebarOpen}
            />
            <main className={styles.content}>
              {authReady ? (
                <AdminSectionAccessShell>
                  <WorkDayGate>{children}</WorkDayGate>
                </AdminSectionAccessShell>
              ) : (
                <div className={styles.contentLoading} aria-busy="true" aria-label="Загрузка">
                  <div className={styles.loadingSpinner} />
                </div>
              )}
            </main>
          </div>
        </div>
      </WorkDayProvider>
    </AdminAccessibleResourcesProvider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const store = getOrCreateStore();

  return (
    <Provider store={store}>
      <QueryProvider>
        <AuthProvider>
          <AdminLayoutContent>{children}</AdminLayoutContent>
        </AuthProvider>
      </QueryProvider>
    </Provider>
  );
}
