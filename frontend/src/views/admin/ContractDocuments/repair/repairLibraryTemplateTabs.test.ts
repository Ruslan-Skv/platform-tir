import { libraryTemplateTabIdsForPackageKind } from './repairLibraryTemplateTabs';

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
