import React from 'react';
import { FooterSections } from './FooterSections';
import { FooterBottom } from './FooterBottom';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <FooterSections />
      <FooterBottom />
    </footer>
  );
};

