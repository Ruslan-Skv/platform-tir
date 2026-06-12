import type { PartnerEditFormData } from './partner-edit-page.types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

export const INITIAL_PARTNER_EDIT_FORM: PartnerEditFormData = {
  name: '',
  logoUrl: '',
  showLogoOnCards: true,
  tooltipText: '',
  showTooltip: true,
  website: '',
  email: '',
  phones: [],
  description: '',
  isActive: true,
};
