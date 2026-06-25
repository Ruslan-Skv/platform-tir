import { describe, expect, it } from '@jest/globals';

import { resolveAdminHomePath, resolveAdminHomePathForRole } from './admin-resources';

describe('resolveAdminHomePathForRole', () => {
  it('sends trainees to knowledge platform', () => {
    expect(resolveAdminHomePathForRole('TRAINEE')).toBe('/admin/knowledge');
  });

  it('sends other roles to dashboard', () => {
    expect(resolveAdminHomePathForRole('MANAGER')).toBe('/admin');
    expect(resolveAdminHomePathForRole(undefined)).toBe('/admin');
  });
});

describe('resolveAdminHomePath', () => {
  it('prefers dashboard when available', () => {
    expect(resolveAdminHomePath((id) => id === 'admin' || id === 'admin.knowledge')).toBe('/admin');
  });

  it('falls back to first accessible section when dashboard is closed', () => {
    expect(resolveAdminHomePath((id) => id === 'admin.knowledge')).toBe('/admin/knowledge');
  });

  it('uses knowledge as last-resort fallback', () => {
    expect(resolveAdminHomePath(() => false)).toBe('/admin/knowledge');
  });
});
