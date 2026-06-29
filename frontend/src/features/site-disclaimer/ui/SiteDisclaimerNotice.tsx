import type { SiteDisclaimerInfo } from '@/shared/lib/site-disclaimer';
import { isSiteDisclaimerActive } from '@/shared/lib/site-disclaimer';

import styles from './SiteDisclaimerNotice.module.css';

type SiteDisclaimerNoticeProps = {
  data?: SiteDisclaimerInfo | null;
  className?: string;
};

export function SiteDisclaimerNotice({ data, className }: SiteDisclaimerNoticeProps) {
  if (!isSiteDisclaimerActive(data)) {
    return null;
  }

  return <p className={`${styles.notice}${className ? ` ${className}` : ''}`}>{data!.content}</p>;
}
