'use client';

import type { CSSProperties } from 'react';

import { BadgeTooltip } from '@/shared/ui/BadgeTooltip';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

export type PackageHubPayOrb = {
  title: string;
  bannerText: string;
  bannerStyle: CSSProperties;
};

export function PackageHubPayTitleAside({ orb }: { orb: PackageHubPayOrb }) {
  return (
    <div className={crmFormStyles.fillBannerTooltipWrap}>
      <BadgeTooltip content={orb.title} side="left">
        <div
          className={crmFormStyles.fillBanner}
          style={orb.bannerStyle}
          data-modal-footer-info
          role="status"
        >
          <span data-modal-footer-info-text>{orb.bannerText}</span>
        </div>
      </BadgeTooltip>
    </div>
  );
}
