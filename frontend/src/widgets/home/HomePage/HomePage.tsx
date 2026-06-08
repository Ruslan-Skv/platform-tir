'use client';

import React from 'react';

import type { HomeSectionsVisibility } from '@/shared/api/home-sections';
import { useHomeSectionsVisibility } from '@/shared/lib/hooks/useHomePageData';
import {
  AdvantagesSection,
  CategoriesGrid,
  ContactSection,
  FeaturedProducts,
  HeroSection,
  ServicesSection,
} from '@/widgets/home';
import type { HeroConfig } from '@/widgets/home/ui/HeroSection/hero.config';

import styles from './HomePage.module.css';

const DEFAULT_VISIBILITY: HomeSectionsVisibility = {
  heroVisible: true,
  directionsVisible: true,
  advantagesVisible: true,
  servicesVisible: true,
  featuredProductsVisible: true,
  contactFormVisible: true,
};

interface HomePageProps {
  initialHeroData?: HeroConfig | null;
}

export const HomePage: React.FC<HomePageProps> = ({ initialHeroData }) => {
  const { data: visibility = DEFAULT_VISIBILITY } = useHomeSectionsVisibility(DEFAULT_VISIBILITY);

  return (
    <div className={styles.homePage}>
      {visibility.heroVisible && <HeroSection initialData={initialHeroData} />}
      {visibility.directionsVisible && <CategoriesGrid />}
      {visibility.advantagesVisible && <AdvantagesSection />}
      {visibility.servicesVisible && <ServicesSection />}
      {visibility.featuredProductsVisible && <FeaturedProducts />}
      {visibility.contactFormVisible && <ContactSection />}
    </div>
  );
};
