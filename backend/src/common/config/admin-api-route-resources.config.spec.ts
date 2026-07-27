import { resolveAdminApiRouteResource } from './admin-api-route-resources.config';

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
});
