import {
  libraryTemplateTabIdsForPackageKind,
  normalizeLibraryTemplateTabForPackageKind,
} from './packageLibraryTemplateTabs';

describe('libraryTemplateTabIdsForPackageKind', () => {
  it('includes consent for all directions', () => {
    for (const kind of ['REPAIR', 'WINDOWS', 'DOORS', 'BLINDS', 'CEILINGS'] as const) {
      expect(libraryTemplateTabIdsForPackageKind(kind)).toContain('consent');
    }
  });

  it('includes memo for product directions', () => {
    expect(libraryTemplateTabIdsForPackageKind('WINDOWS')).toContain('memo');
    expect(libraryTemplateTabIdsForPackageKind('DOORS')).toContain('memo');
    expect(libraryTemplateTabIdsForPackageKind('BLINDS')).toContain('memo');
    expect(libraryTemplateTabIdsForPackageKind('CEILINGS')).toContain('memo');
    expect(libraryTemplateTabIdsForPackageKind('REPAIR')).not.toContain('memo');
  });

  it('includes deliveryNote for DOORS and BLINDS library only', () => {
    expect(libraryTemplateTabIdsForPackageKind('DOORS')).toContain('deliveryNote');
    expect(libraryTemplateTabIdsForPackageKind('BLINDS')).toContain('deliveryNote');
    expect(libraryTemplateTabIdsForPackageKind('CEILINGS')).not.toContain('deliveryNote');
    expect(libraryTemplateTabIdsForPackageKind('WINDOWS')).not.toContain('deliveryNote');
    expect(libraryTemplateTabIdsForPackageKind('REPAIR')).not.toContain('deliveryNote');
  });

  it('excludes repair-only tabs for product directions', () => {
    for (const kind of ['WINDOWS', 'DOORS', 'BLINDS', 'CEILINGS'] as const) {
      const tabs = libraryTemplateTabIdsForPackageKind(kind);
      expect(tabs).not.toContain('actStart');
      expect(tabs).not.toContain('productionLog');
    }
  });
});

describe('normalizeLibraryTemplateTabForPackageKind', () => {
  it('keeps memo for product directions after reload', () => {
    expect(normalizeLibraryTemplateTabForPackageKind('memo', 'WINDOWS')).toBe('memo');
    expect(normalizeLibraryTemplateTabForPackageKind('memo', 'DOORS')).toBe('memo');
    expect(normalizeLibraryTemplateTabForPackageKind('memo', 'BLINDS')).toBe('memo');
    expect(normalizeLibraryTemplateTabForPackageKind('memo', 'CEILINGS')).toBe('memo');
  });

  it('maps memo to contract for REPAIR where tab is unavailable', () => {
    expect(normalizeLibraryTemplateTabForPackageKind('memo', 'REPAIR')).toBe('contract');
  });

  it('maps deliveryNote to contract for directions without накладная', () => {
    expect(normalizeLibraryTemplateTabForPackageKind('deliveryNote', 'WINDOWS')).toBe('contract');
    expect(normalizeLibraryTemplateTabForPackageKind('deliveryNote', 'REPAIR')).toBe('contract');
    expect(normalizeLibraryTemplateTabForPackageKind('deliveryNote', 'CEILINGS')).toBe('contract');
    expect(normalizeLibraryTemplateTabForPackageKind('deliveryNote', 'DOORS')).toBe('deliveryNote');
    expect(normalizeLibraryTemplateTabForPackageKind('deliveryNote', 'BLINDS')).toBe(
      'deliveryNote'
    );
  });
});
