import React from 'react';

import { ActionButtons } from '@/widgets/header/ActionButtons';

import styles from './ContactSection.module.css';

export const ContactSection: React.FC = () => {
  return (
    <section className={styles.contact}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h2 className={styles.title}>Готовы начать проект?</h2>
          <p className={styles.subtitle}>
            Оставьте заявку и получите бесплатную консультацию специалиста
          </p>

          <div className={styles.buttons}>
            <ActionButtons />
          </div>
        </div>
      </div>
    </section>
  );
};
