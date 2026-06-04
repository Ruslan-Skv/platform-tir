import {
  libraryTemplateTabIdsForPackageKind,
  normalizeLibraryTemplateTabForPackageKind,
} from './repairLibraryTemplateTabs';

describe('libraryTemplateTabIdsForPackageKind', () => {
  it('includes memo only for WINDOWS', () => {
    expect(libraryTemplateTabIdsForPackageKind('WINDOWS')).toContain('memo');
    expect(libraryTemplateTabIdsForPackageKind('REPAIR')).not.toContain('memo');
  });

  it('excludes repair-only tabs for WINDOWS', () => {
    const windows = libraryTemplateTabIdsForPackageKind('WINDOWS');
    expect(windows).not.toContain('actStart');
    expect(windows).not.toContain('productionLog');
  });
});

describe('normalizeLibraryTemplateTabForPackageKind', () => {
  it('keeps memo for WINDOWS after reload', () => {
    expect(normalizeLibraryTemplateTabForPackageKind('memo', 'WINDOWS')).toBe('memo');
  });

  it('maps memo to contract for REPAIR where tab is unavailable', () => {
    expect(normalizeLibraryTemplateTabForPackageKind('memo', 'REPAIR')).toBe('contract');
  });
});
