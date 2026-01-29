import React from 'react';

import { services } from '../../lib/constants';
import styles from './ServicesSection.module.css';

export const ServicesSection: React.FC = () => {
  return (
    <section className={styles.services}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Комплексные решения</h2>
          <p className={styles.subtitle}>Полный цикл услуг для вашего комфорта</p>
        </div>

        <div className={styles.servicesGrid}>
          {services.map((service) => (
            <div key={service.id} className={styles.serviceCard}>
              <div
                className={styles.serviceImage}
                style={service.image ? { backgroundImage: `url(${service.image})` } : undefined}
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
