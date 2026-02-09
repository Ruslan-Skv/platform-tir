import React from 'react';

import styles from './FooterBottom.module.css';

interface FooterBottomProps {
  copyrightCompanyName: string;
  developer: string;
  email: string;
}

export const FooterBottom: React.FC<FooterBottomProps> = ({
  copyrightCompanyName,
  developer,
  email,
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <div className={styles.bottom}>
      <div className={styles.container}>
        <div className={styles.content}>
          <p className={styles.copyright}>
            {currentYear} «{copyrightCompanyName}»
          </p>
          {/* <p className={styles.developer}>
            Разработчик сайта: {developer} ({email})
          </p> */}
        </div>
      </div>
    </div>
  );
};
