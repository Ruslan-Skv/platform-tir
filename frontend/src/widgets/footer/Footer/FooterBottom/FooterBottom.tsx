import Link from 'next/link';

import { SellerLegalNotice } from '@/features/seller-legal/ui/SellerLegalNotice';
import { SiteDisclaimerNotice } from '@/features/site-disclaimer/ui/SiteDisclaimerNotice';
import type { SellerLegalInfo } from '@/shared/lib/legal/seller-legal';
import type { SiteDisclaimerInfo } from '@/shared/lib/legal/site-disclaimer';

import styles from './FooterBottom.module.css';

interface FooterBottomProps {
  copyrightCompanyName: string;
  developer: string;
  email: string;
  sellerLegal?: SellerLegalInfo | null;
  siteDisclaimer?: SiteDisclaimerInfo | null;
}

export const FooterBottom: React.FC<FooterBottomProps> = ({
  copyrightCompanyName,
  sellerLegal,
  siteDisclaimer,
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <div className={styles.bottom}>
      <div className={styles.container}>
        <div className={styles.content}>
          <SiteDisclaimerNotice data={siteDisclaimer} className={styles.siteDisclaimer} />
          <SellerLegalNotice data={sellerLegal} variant="compact" className={styles.legalNotice} />
          <p className={styles.copyright}>
            {currentYear} «{copyrightCompanyName}»
          </p>
          <p className={styles.legalLinkWrap}>
            <Link href="/legal" className={styles.legalLink}>
              Информация о продавце
            </Link>
            <span className={styles.legalSeparator}> · </span>
            <Link href="/offer" className={styles.legalLink}>
              Публичная оферта
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
