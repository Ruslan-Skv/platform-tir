import React from 'react';

import {
  AdvantagesSection,
  CategoriesGrid,
  ContactSection,
  FeaturedProducts,
  HeroSection,
  ServicesSection,
} from '@/widgets/home';

import styles from './HomePage.module.css';

export const HomePage: React.FC = () => {
  return (
    <div className={styles.homePage}>
      <HeroSection />
      <CategoriesGrid />
      <AdvantagesSection />
      <ServicesSection />
      <FeaturedProducts />
      <ContactSection />
    </div>
  );
};
