'use client';

import type { CSSProperties } from 'react';

import { BadgeTooltip } from '@/shared/ui/BadgeTooltip';
import crmFormStyles from '@/views/admin/CRM/Customers/AddCrmCustomerModal.module.css';

export type RepairContractPackageHubPayOrb = {
  title: string;
  bannerText: string;
  bannerStyle: CSSProperties;
};

export function RepairContractPackageHubPayTitleAside({
  orb,
}: {
  orb: RepairContractPackageHubPayOrb;
}) {
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
