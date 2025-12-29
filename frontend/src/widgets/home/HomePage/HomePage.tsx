import React from 'react';
import styles from './HomePage.module.css';
import {
  AdvantagesSection,
  CategoriesGrid,
  ContactSection,
  FeaturedProducts,
  HeroSection,
  ServicesSection,
} from '@/widgets/home';

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

