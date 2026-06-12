export type PartnerEditFormData = {
  name: string;
  logoUrl: string;
  showLogoOnCards: boolean;
  tooltipText: string;
  showTooltip: boolean;
  website: string;
  email: string;
  phones: string[];
  description: string;
  isActive: boolean;
};

export type PartnerEditPageMessage = {
  type: 'success' | 'error';
  text: string;
};
