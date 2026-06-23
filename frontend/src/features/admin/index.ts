export { AdminEditableActions, AdminMutationButton } from './components/AdminEditableActions';
export { AdminSectionAccessShell } from './components/AdminSectionAccessShell';
export { AdminResourceEditGate } from './components/AdminResourceEditGate';
export { AdminResourceReadOnlyBanner } from './components/AdminResourceReadOnlyBanner';
export { useAdminSectionPermission } from './hooks/useAdminSectionPermission';
export { useAdminSectionCanEdit } from './contexts/AdminSectionPermissionContext';
export { guardAdminMutation, canRunAdminMutation } from './lib/guardAdminMutation';
export {
  useAdminAccessibleResources,
  useAdminResourcePermission,
} from './contexts/AdminAccessibleResourcesContext';
