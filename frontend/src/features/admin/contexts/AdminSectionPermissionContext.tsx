'use client';

import { createContext, useContext } from 'react';

export type AdminSectionPermissionState = {
  canEdit: boolean;
  canView: boolean;
  isLoading: boolean;
  resourceId: string | null;
  sectionLabel: string | null;
};

const defaultState: AdminSectionPermissionState = {
  canEdit: true,
  canView: true,
  isLoading: false,
  resourceId: null,
  sectionLabel: null,
};

export const AdminSectionPermissionContext =
  createContext<AdminSectionPermissionState>(defaultState);

export function useAdminSectionCanEdit(): Pick<
  AdminSectionPermissionState,
  'canEdit' | 'canView' | 'isLoading' | 'resourceId' | 'sectionLabel'
> {
  return useContext(AdminSectionPermissionContext);
}
