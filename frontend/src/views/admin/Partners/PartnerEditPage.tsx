'use client';

import { PartnerEditPageView } from './PartnerEditPageView';
import { usePartnerEditPage } from './hooks/usePartnerEditPage';

interface PartnerEditPageProps {
  partnerId?: string;
}

export function PartnerEditPage({ partnerId }: PartnerEditPageProps) {
  const model = usePartnerEditPage({ partnerId });
  return <PartnerEditPageView model={model} />;
}
