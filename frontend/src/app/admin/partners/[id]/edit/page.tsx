'use client';

import { use } from 'react';

import { PartnerEditPage } from '@/views/admin/Partners';

export default function AdminPartnerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PartnerEditPage partnerId={id} />;
}
