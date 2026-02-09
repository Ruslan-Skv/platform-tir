'use client';

import React from 'react';

import { UserAuthProvider } from '@/features/auth/context/UserAuthContext';
import { FormModals, FormProvider } from '@/features/forms';
import { useTheme } from '@/features/theme';
import { Background } from '@/widgets/background';
import { ChatSupportWidget } from '@/widgets/chat-support';
import { Footer } from '@/widgets/footer';
import { Header } from '@/widgets/header';

interface SiteLayoutProps {
  children: React.ReactNode;
}

export const SiteLayout: React.FC<SiteLayoutProps> = ({ children }) => {
  const { isDarkTheme } = useTheme();

  return (
    <UserAuthProvider>
      <FormProvider>
        <div
          className="App"
          data-app-theme={isDarkTheme ? 'dark' : 'light'}
          suppressHydrationWarning
        >
          <Background />
          <Header />

          <div className="mainContent">{children}</div>

          <Footer />
          <ChatSupportWidget />
          <FormModals />
        </div>
      </FormProvider>
    </UserAuthProvider>
  );
};
