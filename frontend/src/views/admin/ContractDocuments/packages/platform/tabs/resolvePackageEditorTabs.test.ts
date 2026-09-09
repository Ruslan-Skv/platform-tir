import { PACKAGE_DOCUMENT_TAB_IDS } from './packageDocumentTabs';
import { resolvePackageEditorVisibleTabs } from './resolvePackageEditorTabs';

describe('resolvePackageEditorVisibleTabs', () => {
  it('shows consent tab for REPAIR, WINDOWS, DOORS, BLINDS and CEILINGS', () => {
    for (const kind of ['REPAIR', 'WINDOWS', 'DOORS', 'BLINDS', 'CEILINGS'] as const) {
      const tabs = resolvePackageEditorVisibleTabs({
        tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
        packageKind: kind,
        addendumSlotCount: 0,
      });
      expect(tabs).toContain('consent');
    }
  });

  it('hides memo for REPAIR and shows it for DOORS, BLINDS and CEILINGS', () => {
    const repair = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'REPAIR',
      addendumSlotCount: 0,
    });
    for (const kind of ['DOORS', 'BLINDS', 'CEILINGS'] as const) {
      const tabs = resolvePackageEditorVisibleTabs({
        tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
        packageKind: kind,
        addendumSlotCount: 0,
      });
      expect(repair).not.toContain('memo');
      expect(tabs).toContain('memo');
    }
  });

  it('shows deliveryNote for DOORS and BLINDS after actAcceptance and before memo', () => {
    const repair = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'REPAIR',
      addendumSlotCount: 0,
    });
    const windows = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'WINDOWS',
      addendumSlotCount: 0,
    });
    const ceilings = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'CEILINGS',
      addendumSlotCount: 0,
    });
    expect(repair).not.toContain('deliveryNote');
    expect(windows).not.toContain('deliveryNote');
    expect(ceilings).not.toContain('deliveryNote');
    for (const kind of ['DOORS', 'BLINDS'] as const) {
      const tabs = resolvePackageEditorVisibleTabs({
        tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
        packageKind: kind,
        addendumSlotCount: 0,
      });
      expect(tabs).toContain('deliveryNote');
      const actIdx = tabs.indexOf('actAcceptance');
      const deliveryIdx = tabs.indexOf('deliveryNote');
      const memoIdx = tabs.indexOf('memo');
      expect(deliveryIdx).toBeGreaterThan(actIdx);
      expect(memoIdx).toBeGreaterThan(deliveryIdx);
    }
  });

  it('shows finalEstimate for REPAIR and specification (not finalEstimate) for PRODUCT_LIKE', () => {
    const repair = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'REPAIR',
      addendumSlotCount: 0,
    });
    const windows = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'WINDOWS',
      addendumSlotCount: 0,
    });
    expect(repair).toContain('finalEstimate');
    expect(repair).not.toContain('specification');
    expect(windows).toContain('specification');
    expect(windows).not.toContain('finalEstimate');
    const specIdx = windows.indexOf('specification');
    const estimateIdx = windows.indexOf('estimate');
    expect(specIdx).toBeLessThan(estimateIdx);
  });

  it('hides actStart and productionLog for WINDOWS', () => {
    const tabs = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'WINDOWS',
      addendumSlotCount: 0,
    });
    expect(tabs).not.toContain('actStart');
    expect(tabs).not.toContain('productionLog');
    expect(tabs).not.toContain('workOrderAddendum1');
  });

  it('stage-3 FURNITURE shows montage tabs only when enabled', () => {
    const withoutMontage = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'FURNITURE',
      addendumSlotCount: 0,
      furnitureMontageEnabled: false,
      furnitureAppliancesEnabled: false,
    });
    expect(withoutMontage).toContain('specification');
    expect(withoutMontage).not.toContain('estimate');
    expect(withoutMontage).not.toContain('actStart');
    expect(withoutMontage).not.toContain('workOrder');
    expect(withoutMontage).not.toContain('deliveryNote');

    const withMontage = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'FURNITURE',
      addendumSlotCount: 0,
      furnitureMontageEnabled: true,
      furnitureAppliancesEnabled: false,
    });
    expect(withMontage).toContain('estimate');
    expect(withMontage).toContain('actStart');
    expect(withMontage).toContain('workOrder');
    expect(withMontage).not.toContain('deliveryNote');
  });

  it('stage-4 FURNITURE shows appliances list only when enabled', () => {
    const withAppliances = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'FURNITURE',
      addendumSlotCount: 0,
      furnitureMontageEnabled: false,
      furnitureAppliancesEnabled: true,
    });
    expect(withAppliances).toContain('deliveryNote');
    expect(withAppliances).not.toContain('estimate');
  });
});
