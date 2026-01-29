'use client';

import React, { useEffect, useState } from 'react';

import styles from './ServicesSection.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  features: string[];
  price: string;
  imageUrl: string | null;
  sortOrder: number;
}

interface ServicesData {
  block: { title: string; subtitle: string };
  items: ServiceItem[];
}

const DEFAULT_DATA: ServicesData = {
  block: {
    title: 'Комплексные решения',
    subtitle: 'Полный цикл услуг для вашего комфорта',
  },
  items: [],
};

export const ServicesSection: React.FC = () => {
  const [data, setData] = useState<ServicesData>(DEFAULT_DATA);

  useEffect(() => {
    fetch(`${API_URL}/home/services`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d: ServicesData | null) => {
        if (d?.block) setData(d);
      })
      .catch(() => {});
  }, []);

  const imageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <section className={styles.services}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{data.block.title}</h2>
          <p className={styles.subtitle}>{data.block.subtitle}</p>
        </div>

        <div className={styles.servicesGrid}>
          {data.items.map((service) => (
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
