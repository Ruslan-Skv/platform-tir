export const PRODUCT_FORM_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const PRODUCT_IMAGE_MAX_FILE_SIZE = 5 * 1024 * 1024;

export const PRODUCT_IMAGE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
