import { matchAdminApiResourceRule } from './admin-api-resource-rules.config';
import { resolveAdminApiRouteResource } from './admin-api-route-resources.config';
import { AdminResourcePermissionLevel } from '../types/admin-resource-permission-level';

describe('resolveAdminApiRouteResource', () => {
  it('does not map own profile endpoints to admin.users', () => {
    expect(resolveAdminApiRouteResource('PATCH', '/api/v1/users/me')).toBeNull();
    expect(
      resolveAdminApiRouteResource('GET', '/api/v1/users/me/notification-settings'),
    ).toBeNull();
    expect(resolveAdminApiRouteResource('POST', '/api/v1/users/me/avatar')).toBeNull();
  });

  it('still maps admin user management routes to admin.users', () => {
    expect(resolveAdminApiRouteResource('GET', '/api/v1/users')).toEqual({
      resourceId: 'admin.users',
      isMutation: false,
    });
    expect(resolveAdminApiRouteResource('PATCH', '/api/v1/users/cm123')).toEqual({
      resourceId: 'admin.users',
      isMutation: true,
    });
  });

  it('maps contract-document-objects to Договора, not settings hub', () => {
    expect(resolveAdminApiRouteResource('GET', '/api/v1/admin/contract-document-objects')).toEqual({
      resourceId: 'admin.contract-documents.repair',
      isMutation: false,
    });
    expect(
      resolveAdminApiRouteResource('POST', '/api/v1/admin/contract-document-objects/auto-sync'),
    ).toEqual({
      resourceId: 'admin.contract-documents.repair',
      isMutation: true,
    });
  });
});

describe('matchAdminApiResourceRule crm-directions shared reads', () => {
  it('skips resource check for shared CRM direction lookups', () => {
    expect(matchAdminApiResourceRule('GET', '/api/v1/admin/crm-directions')).toBeNull();
    expect(matchAdminApiResourceRule('GET', '/api/v1/admin/crm-directions/users/list')).toBeNull();
    expect(
      matchAdminApiResourceRule('GET', '/api/v1/admin/crm-directions/users/me/directions'),
    ).toBeNull();
  });

  it('still guards CRM direction mutations via admin.crm', () => {
    expect(matchAdminApiResourceRule('POST', '/api/v1/admin/crm-directions')).toEqual({
      resourceId: 'admin.crm',
      level: AdminResourcePermissionLevel.EDIT,
    });
    expect(
      matchAdminApiResourceRule('PUT', '/api/v1/admin/crm-directions/users/u1/directions'),
    ).toEqual({
      resourceId: 'admin.crm',
      level: AdminResourcePermissionLevel.EDIT,
    });
  });
});
