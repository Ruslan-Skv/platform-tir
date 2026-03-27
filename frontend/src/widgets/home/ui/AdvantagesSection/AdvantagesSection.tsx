'use client';

import React from 'react';

import { advantages } from '@/widgets/home/lib/constants';

import { AdvantageCard } from './AdvantageCard';
import styles from './AdvantagesSection.module.css';

const ADVANTAGES_BLOCK = {
  title: 'Почему выбирают нас',
  subtitle: 'Мы делаем качество доступным',
};

export const AdvantagesSection: React.FC = () => {
  return (
    <section className={styles.advantages}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{ADVANTAGES_BLOCK.title}</h2>
          <p className={styles.subtitle}>{ADVANTAGES_BLOCK.subtitle}</p>
        </div>

        <div className={styles.grid}>
          {advantages.map((item) => {
            const advantage = {
              id: String(item.id),
              icon: item.icon,
              title: item.title,
              description: item.description,
            };
            return <AdvantageCard key={item.id} advantage={advantage} />;
          })}
        </div>
      </div>
    </section>
  );
};
