import { describe, expect, it } from 'vitest';

import {
  libraryTemplateTabIdsForPackageKind,
  normalizeLibraryTemplateTabForPackageKind,
} from './packageLibraryTemplateTabs';

describe('libraryTemplateTabIdsForPackageKind', () => {
  it('includes consent for all directions', () => {
    for (const kind of ['REPAIR', 'WINDOWS', 'DOORS'] as const) {
      expect(libraryTemplateTabIdsForPackageKind(kind)).toContain('consent');
    }
  });

  it('includes memo for WINDOWS and DOORS product directions', () => {
    expect(libraryTemplateTabIdsForPackageKind('WINDOWS')).toContain('memo');
    expect(libraryTemplateTabIdsForPackageKind('DOORS')).toContain('memo');
    expect(libraryTemplateTabIdsForPackageKind('REPAIR')).not.toContain('memo');
  });

  it('excludes repair-only tabs for WINDOWS and DOORS', () => {
    for (const kind of ['WINDOWS', 'DOORS'] as const) {
      const tabs = libraryTemplateTabIdsForPackageKind(kind);
      expect(tabs).not.toContain('actStart');
      expect(tabs).not.toContain('productionLog');
    }
  });
});

describe('normalizeLibraryTemplateTabForPackageKind', () => {
  it('keeps memo for WINDOWS and DOORS after reload', () => {
    expect(normalizeLibraryTemplateTabForPackageKind('memo', 'WINDOWS')).toBe('memo');
    expect(normalizeLibraryTemplateTabForPackageKind('memo', 'DOORS')).toBe('memo');
  });

  it('maps memo to contract for REPAIR where tab is unavailable', () => {
    expect(normalizeLibraryTemplateTabForPackageKind('memo', 'REPAIR')).toBe('contract');
  });
});
