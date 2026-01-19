import React from 'react';

import styles from './Footer.module.css';
import { FooterBottom } from './FooterBottom';
import { FooterSections } from './FooterSections';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <FooterSections />
      <FooterBottom />
    </footer>
  );
};
