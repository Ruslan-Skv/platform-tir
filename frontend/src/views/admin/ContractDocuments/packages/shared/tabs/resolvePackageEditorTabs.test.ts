import { describe, expect, it } from 'vitest';

import { REPAIR_DOCUMENT_TAB_IDS } from '../../directions/repair/documents/repairDocumentTabs';
import { resolvePackageEditorVisibleTabs } from './resolvePackageEditorTabs';

describe('resolvePackageEditorVisibleTabs', () => {
  it('hides memo for REPAIR and shows it for DOORS', () => {
    const repair = resolvePackageEditorVisibleTabs({
      tabOrder: REPAIR_DOCUMENT_TAB_IDS,
      packageKind: 'REPAIR',
      addendumSlotCount: 0,
    });
    const doors = resolvePackageEditorVisibleTabs({
      tabOrder: REPAIR_DOCUMENT_TAB_IDS,
      packageKind: 'DOORS',
      addendumSlotCount: 0,
    });
    expect(repair).not.toContain('memo');
    expect(doors).toContain('memo');
  });

  it('shows finalEstimate for REPAIR and specification (not finalEstimate) for PRODUCT_LIKE', () => {
    const repair = resolvePackageEditorVisibleTabs({
      tabOrder: REPAIR_DOCUMENT_TAB_IDS,
      packageKind: 'REPAIR',
      addendumSlotCount: 0,
    });
    const windows = resolvePackageEditorVisibleTabs({
      tabOrder: REPAIR_DOCUMENT_TAB_IDS,
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
      tabOrder: REPAIR_DOCUMENT_TAB_IDS,
      packageKind: 'WINDOWS',
      addendumSlotCount: 0,
    });
    expect(tabs).not.toContain('actStart');
    expect(tabs).not.toContain('productionLog');
    expect(tabs).not.toContain('workOrderAddendum1');
  });
});
