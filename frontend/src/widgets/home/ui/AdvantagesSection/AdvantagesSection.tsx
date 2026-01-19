import React from 'react';

import { advantages } from '../../lib/constants';
import { AdvantageCard } from './AdvantageCard';
import styles from './AdvantagesSection.module.css';

export const AdvantagesSection: React.FC = () => {
  return (
    <section className={styles.advantages}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Почему выбирают нас</h2>
          <p className={styles.subtitle}>Мы делаем качество доступным</p>
        </div>

        <div className={styles.grid}>
          {advantages.map((advantage) => (
            <AdvantageCard key={advantage.id} advantage={advantage} />
          ))}
        </div>
      </div>
    </section>
  );
};
