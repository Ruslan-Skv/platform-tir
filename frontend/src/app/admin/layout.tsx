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
import {
  ADMIN_SIDEBAR_COLLAPSED_WIDTH,
  ADMIN_SIDEBAR_DEFAULT_WIDTH,
  clampAdminSidebarWidth,
  persistAdminSidebarCollapsed,
  persistAdminSidebarWidth,
  readStoredAdminSidebarCollapsed,
  readStoredAdminSidebarWidth,
} from '@/shared/lib/admin-sidebar-layout';
import { QueryProvider } from '@/shared/lib/react-query/QueryProvider';
import { AdminHeader } from '@/widgets/admin/Header/AdminHeader';
import { AdminPresenceHeartbeat } from '@/widgets/admin/Header/AdminPresenceHeartbeat';
import { AdminSidebar } from '@/widgets/admin/Sidebar/AdminSidebar';

import styles from './layout.module.css';

function syncSidebarCssVars(width: number, collapsed: boolean, isMobile: boolean) {
  if (typeof document === 'undefined') return;
  const offset = isMobile ? 0 : collapsed ? ADMIN_SIDEBAR_COLLAPSED_WIDTH : width;
  const root = document.documentElement;
  root.style.setProperty('--admin-sidebar-width', `${width}px`);
  root.style.setProperty('--admin-sidebar-offset', `${offset}px`);
  if (collapsed) root.setAttribute('data-admin-sidebar-collapsed', '');
  else root.removeAttribute('data-admin-sidebar-collapsed');
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(ADMIN_SIDEBAR_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [sidebarLayoutReady, setSidebarLayoutReady] = useState(false);
  const [sidebarTransitionsReady, setSidebarTransitionsReady] = useState(false);

  useEffect(() => {
    const width = readStoredAdminSidebarWidth();
    const collapsed = readStoredAdminSidebarCollapsed();
    setSidebarWidth(width);
    setSidebarCollapsed(collapsed);

    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const syncMobileLayout = () => {
      const mobile = mediaQuery.matches;
      setIsMobileLayout(mobile);
      syncSidebarCssVars(width, collapsed, mobile);
    };
    syncMobileLayout();
    setSidebarLayoutReady(true);
    mediaQuery.addEventListener('change', syncMobileLayout);

    // Включаем transition только после первого применения сохранённой ширины
    const id = window.requestAnimationFrame(() => setSidebarTransitionsReady(true));
    return () => {
      mediaQuery.removeEventListener('change', syncMobileLayout);
      window.cancelAnimationFrame(id);
    };
  }, []);

  useEffect(() => {
    if (!sidebarLayoutReady) return;
    syncSidebarCssVars(sidebarWidth, sidebarCollapsed, isMobileLayout);
  }, [sidebarWidth, sidebarCollapsed, isMobileLayout, sidebarLayoutReady]);

  const handleSidebarWidthChange = (width: number) => {
    const clamped = clampAdminSidebarWidth(width);
    setSidebarWidth(clamped);
    persistAdminSidebarWidth(clamped);
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

  // Не авторизован — короткий спиннер до редиректа на login (без оболочки)
  if (!isLoading && (!isAuthenticated || !isAdmin)) {
    return (
      <div className={styles.loadingContainer} aria-busy="true" aria-label="Загрузка">
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  const effectiveSidebarWidth = sidebarCollapsed ? ADMIN_SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;
  const mainAreaMarginLeft = isMobileLayout ? 0 : effectiveSidebarWidth;
  const sidebarCollapsedForView = isMobileLayout ? false : sidebarCollapsed;

  const handleSidebarToggle = () => {
    if (isMobileLayout) {
      setMobileSidebarOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      persistAdminSidebarCollapsed(next);
      return next;
    });
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
            transitionsEnabled={sidebarTransitionsReady && !isResizing}
            applyInlineWidth={sidebarLayoutReady}
          />
          <div
            className={`${styles.mainArea} ${sidebarCollapsed ? styles.expanded : ''} ${isResizing || !sidebarTransitionsReady ? styles.resizing : ''}`}
            style={
              sidebarLayoutReady
                ? {
                    marginLeft: mainAreaMarginLeft,
                    ['--admin-main-offset-left' as string]: `${mainAreaMarginLeft}px`,
                  }
                : undefined
            }
          >
            <AdminPresenceHeartbeat />
            <AdminHeader
              onMobileMenuOpen={() => setMobileSidebarOpen((open) => !open)}
              mobileMenuOpen={mobileSidebarOpen}
            />
            <main className={styles.content}>
              {/* Пока auth грузится — уже рендерим страницу (без спиннера), чтобы дашборд
                  мог плавно проявиться из прозрачности. Неавторизованных отсекает early-return выше. */}
              <AdminSectionAccessShell>
                <WorkDayGate>{children}</WorkDayGate>
              </AdminSectionAccessShell>
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
