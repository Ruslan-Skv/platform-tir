'use client';

import React from 'react';

import { UserAuthProvider } from '@/features/auth/context/UserAuthContext';
import { FormModals, FormProvider } from '@/features/forms';
import { useTheme } from '@/features/theme';
import { ApprovedOrderGuardProvider } from '@/shared/lib/contexts/ApprovedOrderGuardContext';
import { SitePublicConfigProvider } from '@/shared/lib/contexts/SitePublicConfigContext';
import { Background } from '@/widgets/background';
import { ChatSupportOpenProvider, ChatSupportWidget } from '@/widgets/chat-support';
import { Footer } from '@/widgets/footer';
import { Header } from '@/widgets/header';

import { MobileBottomNav } from '../MobileBottomNav/MobileBottomNav';

interface SiteLayoutProps {
  children: React.ReactNode;
}

export const SiteLayout: React.FC<SiteLayoutProps> = ({ children }) => {
  const { isDarkTheme } = useTheme();

  return (
    <UserAuthProvider>
      <SitePublicConfigProvider>
        <ApprovedOrderGuardProvider>
          <FormProvider>
            <ChatSupportOpenProvider>
              <div
                className="App"
                data-app-theme={isDarkTheme ? 'dark' : 'light'}
                suppressHydrationWarning
              >
                <Background />
                <Header />

                <div className="mainContent">{children}</div>

                <Footer />
                <MobileBottomNav />
                <ChatSupportWidget />
                <FormModals />
              </div>
            </ChatSupportOpenProvider>
          </FormProvider>
        </ApprovedOrderGuardProvider>
      </SitePublicConfigProvider>
    </UserAuthProvider>
  );
};
