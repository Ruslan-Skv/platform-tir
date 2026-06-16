'use client';

import { AdminHelpTooltip, type AdminHelpTooltipProps } from '@/shared/ui/admin/AdminHelpTooltip';

import cdTemplates from '../../../styles/templates-library.module.css';

export type ContractDocumentsHelpTooltipProps = AdminHelpTooltipProps;

/** @deprecated Используйте AdminHelpTooltip из @/shared/ui/admin/AdminHelpTooltip */
export function ContractDocumentsHelpTooltip({
  wrapClassName,
  ...props
}: ContractDocumentsHelpTooltipProps) {
  return (
    <AdminHelpTooltip
      wrapClassName={wrapClassName ?? cdTemplates.contractFieldHelpWrap}
      {...props}
    />
  );
}
