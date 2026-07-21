import { describe, expect, it } from 'vitest';

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

  it('shows deliveryNote for DOORS, BLINDS and CEILINGS after actAcceptance and before memo', () => {
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
    for (const kind of ['DOORS', 'BLINDS', 'CEILINGS'] as const) {
      const tabs = resolvePackageEditorVisibleTabs({
        tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
        packageKind: kind,
        addendumSlotCount: 0,
      });
      expect(repair).not.toContain('deliveryNote');
      expect(windows).not.toContain('deliveryNote');
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
});
