'use client';

import React from 'react';

import styles from './Background.module.css';

/**
 * Фон приложения. Картинка и тема задаются в CSS по html[data-theme],
 * который выставляется скриптом до React — без мигания при загрузке и навигации.
 */
export const Background: React.FC = () => {
  return <div className={styles.background} aria-hidden />;
};
