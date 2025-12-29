'use client';

import React from 'react';
import { FormModals, FormProvider } from '@/features/forms';
import { Footer } from '@/widgets/footer';
import { Header } from '@/widgets/header';
import { Background } from '@/widgets/background';

interface SiteLayoutProps {
  children: React.ReactNode;
}

export const SiteLayout: React.FC<SiteLayoutProps> = ({ children }) => {
  return (
    <FormProvider>
      <div className="App">
        <Background />
        <Header />

        <div className="mainContent">
          {children}
        </div>

        <Footer />
        <FormModals />
      </div>
    </FormProvider>
  );
};

