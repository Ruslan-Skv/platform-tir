'use client';

import { SellerLegalNotice } from '@/features/seller-legal/ui/SellerLegalNotice';
import { useSellerLegal } from '@/features/seller-legal/useSellerLegal';

type SellerLegalNoticeBlockProps = {
  variant?: 'compact' | 'card';
  className?: string;
};

export function SellerLegalNoticeBlock({
  variant = 'compact',
  className,
}: SellerLegalNoticeBlockProps) {
  const { data } = useSellerLegal();
  return <SellerLegalNotice data={data} variant={variant} className={className} />;
}
