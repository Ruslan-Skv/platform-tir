import { AdminResourcePermissionLevel } from './dto/set-permission.dto';
import {
  getRoleEffectiveAccessForResource,
  getUserEffectiveAccessForResource,
} from './access-effective.util';

describe('access-effective sidebar tree', () => {
  it('does not inherit DENIED from contract-documents hub onto Договора', () => {
    const result = getRoleEffectiveAccessForResource(
      'admin.contract-documents.repair',
      'MANAGER',
      undefined,
      [{ resourceId: 'admin.contract-documents', permission: AdminResourcePermissionLevel.DENIED }],
    );
    expect(result.source).not.toBe('inherited_denied');
    expect(result.effective).toBe('EDIT'); // default for MANAGER
  });

  it('does not inherit DENIED from admin.crm onto Замеры', () => {
    const result = getRoleEffectiveAccessForResource(
      'admin.crm.measurements',
      'MANAGER',
      undefined,
      [{ resourceId: 'admin.crm', permission: AdminResourcePermissionLevel.DENIED }],
    );
    expect(result.source).not.toBe('inherited_denied');
    expect(result.effective).toBe('EDIT');
  });

  it('inherits DENIED from contract-documents hub onto requisites', () => {
    const result = getRoleEffectiveAccessForResource(
      'admin.contract-documents.requisites',
      'MANAGER',
      undefined,
      [{ resourceId: 'admin.contract-documents', permission: AdminResourcePermissionLevel.DENIED }],
    );
    // Settings-restricted for MANAGER → NONE (hard gate), not inherited_denied
    expect(result.effective).toBe('NONE');
  });

  it('allows explicit EDIT on Договора for MANAGER', () => {
    const result = getRoleEffectiveAccessForResource(
      'admin.contract-documents.repair',
      'MANAGER',
      AdminResourcePermissionLevel.EDIT,
      [{ resourceId: 'admin.contract-documents', permission: AdminResourcePermissionLevel.DENIED }],
    );
    expect(result.effective).toBe('EDIT');
    expect(result.source).toBe('role_override');
  });

  it('blocks settings resources for MANAGER even with override', () => {
    const result = getUserEffectiveAccessForResource(
      'admin.settings.appearance',
      'MANAGER',
      AdminResourcePermissionLevel.EDIT,
      AdminResourcePermissionLevel.EDIT,
      [],
    );
    expect(result).toBe('NONE');
  });

  it('allows settings resources for ADMIN', () => {
    const result = getUserEffectiveAccessForResource(
      'admin.settings.appearance',
      'ADMIN',
      undefined,
      undefined,
      [],
    );
    expect(result).toBe('EDIT'); // default
  });
});
