import { publicUploadUrl } from '@/shared/lib/public-upload-url';

export function getPromotionImageUrl(url: string): string {
  return publicUploadUrl(url);
}
