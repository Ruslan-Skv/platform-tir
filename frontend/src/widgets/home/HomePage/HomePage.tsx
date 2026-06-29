'use client';

import React from 'react';

import {
  DEFAULT_HOME_SECTIONS_VISIBILITY,
  type HomeSectionsVisibility,
} from '@/shared/lib/home-sections-visibility';
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
import { HomeSectionVisibility } from './HomeSectionVisibility';

interface HomePageProps {
  initialHeroData?: HeroConfig | null;
  initialSectionsVisibility?: HomeSectionsVisibility;
}

export const HomePage: React.FC<HomePageProps> = ({
  initialHeroData,
  initialSectionsVisibility = DEFAULT_HOME_SECTIONS_VISIBILITY,
}) => {
  const { data: visibility = initialSectionsVisibility } =
    useHomeSectionsVisibility(initialSectionsVisibility);

  return (
    <div className={styles.homePage}>
      <HomeSectionVisibility
        visibility={visibility}
        desktopKey="heroVisible"
        mobileKey="heroMobileVisible"
      >
        <HeroSection initialData={initialHeroData} />
      </HomeSectionVisibility>
      <HomeSectionVisibility
        visibility={visibility}
        desktopKey="directionsVisible"
        mobileKey="directionsMobileVisible"
      >
        <CategoriesGrid />
      </HomeSectionVisibility>
      <HomeSectionVisibility
        visibility={visibility}
        desktopKey="advantagesVisible"
        mobileKey="advantagesMobileVisible"
      >
        <AdvantagesSection />
      </HomeSectionVisibility>
      <HomeSectionVisibility
        visibility={visibility}
        desktopKey="servicesVisible"
        mobileKey="servicesMobileVisible"
      >
        <ServicesSection />
      </HomeSectionVisibility>
      <HomeSectionVisibility
        visibility={visibility}
        desktopKey="featuredProductsVisible"
        mobileKey="featuredProductsMobileVisible"
      >
        <FeaturedProducts />
      </HomeSectionVisibility>
      <HomeSectionVisibility
        visibility={visibility}
        desktopKey="contactFormVisible"
        mobileKey="contactFormMobileVisible"
      >
        <ContactSection />
      </HomeSectionVisibility>
    </div>
  );
};
