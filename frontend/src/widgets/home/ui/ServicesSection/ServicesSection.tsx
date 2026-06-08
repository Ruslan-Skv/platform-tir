'use client';

import React from 'react';

import type { HomeServicesData } from '@/shared/api/home';
import { useHomeServices } from '@/shared/lib/hooks/useHomePageData';

import styles from './ServicesSection.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

const DEFAULT_DATA: HomeServicesData = {
  block: {
    title: 'Комплексные решения',
    subtitle: 'Полный цикл услуг для вашего комфорта',
  },
  items: [],
};

export const ServicesSection: React.FC = () => {
  const { data } = useHomeServices();
  const resolved = data?.block ? data : DEFAULT_DATA;

  const imageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <section className={styles.services}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{resolved.block.title}</h2>
          <p className={styles.subtitle}>{resolved.block.subtitle}</p>
        </div>

        <div className={styles.servicesGrid}>
          {resolved.items.map((service) => (
            <div key={service.id} className={styles.serviceCard}>
              <div
                className={styles.serviceImage}
                style={
                  service.imageUrl
                    ? { backgroundImage: `url(${imageUrl(service.imageUrl)})` }
                    : undefined
                }
              />
              <div className={styles.serviceContent}>
                <h3 className={styles.serviceTitle}>{service.title}</h3>
                <p className={styles.serviceDescription}>{service.description}</p>
                <div className={styles.serviceFeatures}>
                  {service.features.map((feature, index) => (
                    <span key={index} className={styles.feature}>
                      {feature}
                    </span>
                  ))}
                </div>
                <div className={styles.serviceFooter}>
                  <div className={styles.price}>{service.price}</div>
                  <button type="button" className={styles.serviceButton}>
                    Подробнее
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
