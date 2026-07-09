'use client';

import { AdminHelpInfoIcon } from '@/shared/ui/admin/AdminHelpInfoIcon';

import { AdminToolbarIconButton, type AdminToolbarIconButtonProps } from './AdminToolbarIconButton';

const ADMIN_HELP_INFO_ICON_SIZE = 18;

export type AdminHelpInfoButtonProps = Omit<AdminToolbarIconButtonProps, 'children'> & {
  iconSize?: number;
};

export function AdminHelpInfoButton({
  iconSize = ADMIN_HELP_INFO_ICON_SIZE,
  title = 'Справка',
  'aria-label': ariaLabel,
  ...rest
}: AdminHelpInfoButtonProps) {
  return (
    <AdminToolbarIconButton title={title} aria-label={ariaLabel ?? title} {...rest}>
      <AdminHelpInfoIcon size={iconSize} />
    </AdminToolbarIconButton>
  );
}
