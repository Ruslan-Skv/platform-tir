import type { NewServiceItemForm } from './services-section-page.types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
export const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

export const EMPTY_NEW_SERVICE_ITEM: NewServiceItemForm = {
  title: '',
  description: '',
  features: '',
  price: '',
  imageUrl: '',
};
