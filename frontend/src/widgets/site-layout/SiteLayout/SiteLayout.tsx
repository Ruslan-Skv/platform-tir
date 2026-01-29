'use client';

import React from 'react';

import { UserAuthProvider } from '@/features/auth/context/UserAuthContext';
import { FormModals, FormProvider } from '@/features/forms';
import { Background } from '@/widgets/background';
import { ChatSupportWidget } from '@/widgets/chat-support';
import { Footer } from '@/widgets/footer';
import { Header } from '@/widgets/header';

interface SiteLayoutProps {
  children: React.ReactNode;
}

export const SiteLayout: React.FC<SiteLayoutProps> = ({ children }) => {
  return (
    <UserAuthProvider>
      <FormProvider>
        <div className="App">
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
