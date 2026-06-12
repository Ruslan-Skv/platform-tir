import type { NewServiceCategoryForm } from './service-catalog-section-page.types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const INITIAL_NEW_SERVICE_CATEGORY: NewServiceCategoryForm = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  icon: '',
  image: '',
  cardBackgroundImage: '',
  cardBackgroundTransparent: false,
  showPricesInPublic: true,
  priceMarkupPercent: 0,
};
