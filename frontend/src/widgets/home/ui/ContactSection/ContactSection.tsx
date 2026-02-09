'use client';

import React, { useEffect, useState } from 'react';

import { getContactFormBlock } from '@/shared/api/contact-form';
import { ActionButtons } from '@/widgets/header/ActionButtons';

import styles from './ContactSection.module.css';

const DEFAULT_BLOCK = {
  title: 'Готовы начать проект?',
  subtitle: 'Оставьте заявку и получите бесплатную консультацию специалиста',
};

export const ContactSection: React.FC = () => {
  const [block, setBlock] = useState(DEFAULT_BLOCK);

  useEffect(() => {
    getContactFormBlock()
      .then(setBlock)
      .catch(() => {});
  }, []);

  return (
    <section className={styles.contact}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h2 className={styles.title}>{block.title}</h2>
          <p className={styles.subtitle}>{block.subtitle}</p>

          <div className={styles.buttons}>
            <ActionButtons />
          </div>
        </div>
      </div>
    </section>
  );
};
