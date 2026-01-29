import React from 'react';

import styles from './AdvantagesSection.module.css';

interface AdvantageCardProps {
  advantage: {
    id: string;
    icon: string;
    title: string;
    description: string;
  };
}

export const AdvantageCard: React.FC<AdvantageCardProps> = ({ advantage }) => {
  const isIconImage = advantage.icon?.includes('/uploads/');
  return (
    <div className={styles.advantageCard}>
      <div className={styles.icon}>
        {isIconImage ? (
          <img src={advantage.icon} alt="" className={styles.iconImg} />
        ) : (
          advantage.icon
        )}
      </div>
      <h3 className={styles.advantageTitle}>{advantage.title}</h3>
      <p className={styles.advantageDescription}>{advantage.description}</p>
    </div>
  );
};
