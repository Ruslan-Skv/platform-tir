import React from 'react';
import type { Advantage } from '../../lib/constants';
import styles from './AdvantagesSection.module.css';

interface AdvantageCardProps {
  advantage: Advantage;
}

export const AdvantageCard: React.FC<AdvantageCardProps> = ({ advantage }) => {
  return (
    <div className={styles.advantageCard}>
      <div className={styles.icon}>{advantage.icon}</div>
      <h3 className={styles.advantageTitle}>{advantage.title}</h3>
      <p className={styles.advantageDescription}>{advantage.description}</p>
    </div>
  );
};

