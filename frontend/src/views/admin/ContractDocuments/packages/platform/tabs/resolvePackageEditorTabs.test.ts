import { describe, expect, it } from 'vitest';

import { PACKAGE_DOCUMENT_TAB_IDS } from './packageDocumentTabs';
import { resolvePackageEditorVisibleTabs } from './resolvePackageEditorTabs';

describe('resolvePackageEditorVisibleTabs', () => {
  it('shows consent tab for REPAIR, WINDOWS and DOORS', () => {
    for (const kind of ['REPAIR', 'WINDOWS', 'DOORS'] as const) {
      const tabs = resolvePackageEditorVisibleTabs({
        tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
        packageKind: kind,
        addendumSlotCount: 0,
      });
      expect(tabs).toContain('consent');
    }
  });

  it('hides memo for REPAIR and shows it for DOORS', () => {
    const repair = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'REPAIR',
      addendumSlotCount: 0,
    });
    const doors = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'DOORS',
      addendumSlotCount: 0,
    });
    expect(repair).not.toContain('memo');
    expect(doors).toContain('memo');
  });

  it('shows deliveryNote only for DOORS after actAcceptance and before memo', () => {
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
    const doors = resolvePackageEditorVisibleTabs({
      tabOrder: PACKAGE_DOCUMENT_TAB_IDS,
      packageKind: 'DOORS',
      addendumSlotCount: 0,
    });
    expect(repair).not.toContain('deliveryNote');
    expect(windows).not.toContain('deliveryNote');
    expect(doors).toContain('deliveryNote');
    const actIdx = doors.indexOf('actAcceptance');
    const deliveryIdx = doors.indexOf('deliveryNote');
    const memoIdx = doors.indexOf('memo');
    expect(deliveryIdx).toBeGreaterThan(actIdx);
    expect(memoIdx).toBeGreaterThan(deliveryIdx);
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
