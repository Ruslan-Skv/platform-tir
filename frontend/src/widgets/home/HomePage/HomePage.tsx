'use client';

import React, { useCallback, useEffect, useState } from 'react';

import type { HomeSectionsVisibility } from '@/shared/api/home-sections';
import { getHomeSectionsVisibility } from '@/shared/api/home-sections';
import {
  AdvantagesSection,
  CategoriesGrid,
  ContactSection,
  FeaturedProducts,
  HeroSection,
  ServicesSection,
} from '@/widgets/home';

import styles from './HomePage.module.css';

const DEFAULT_VISIBILITY: HomeSectionsVisibility = {
  heroVisible: true,
  directionsVisible: true,
  advantagesVisible: true,
  servicesVisible: true,
  featuredProductsVisible: true,
  contactFormVisible: true,
};

export const HomePage: React.FC = () => {
  const [visibility, setVisibility] = useState<HomeSectionsVisibility>(DEFAULT_VISIBILITY);

  const loadVisibility = useCallback(async () => {
    try {
      const data = await getHomeSectionsVisibility();
      setVisibility(data);
    } catch {
      setVisibility(DEFAULT_VISIBILITY);
    }
  }, []);

  useEffect(() => {
    loadVisibility();
  }, [loadVisibility]);

  return (
    <div className={styles.homePage}>
      {visibility.heroVisible && <HeroSection />}
      {visibility.directionsVisible && <CategoriesGrid />}
      {visibility.advantagesVisible && <AdvantagesSection />}
      {visibility.servicesVisible && <ServicesSection />}
      {visibility.featuredProductsVisible && <FeaturedProducts />}
      {visibility.contactFormVisible && <ContactSection />}
    </div>
  );
};
