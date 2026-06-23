'use client';

import { createContext, useContext } from 'react';

export type AdminSectionPermissionState = {
  canEdit: boolean;
  canParticipate: boolean;
  canView: boolean;
  isLoading: boolean;
  resourceId: string | null;
  sectionLabel: string | null;
};

const defaultState: AdminSectionPermissionState = {
  canEdit: true,
  canParticipate: true,
  canView: true,
  isLoading: false,
  resourceId: null,
  sectionLabel: null,
};

export const AdminSectionPermissionContext =
  createContext<AdminSectionPermissionState>(defaultState);

export function useAdminSectionCanEdit(): Pick<
  AdminSectionPermissionState,
  'canEdit' | 'canParticipate' | 'canView' | 'isLoading' | 'resourceId' | 'sectionLabel'
> {
  return useContext(AdminSectionPermissionContext);
}
