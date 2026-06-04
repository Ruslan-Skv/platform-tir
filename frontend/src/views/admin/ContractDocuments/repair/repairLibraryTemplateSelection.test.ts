import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';

import {
  canAutosaveLibraryTemplatePreset,
  repairMisassignedWindowsLibraryPresetTabId,
  resolveLibraryTemplateSelection,
} from './repairLibraryTemplateSelection';

const contractPreset: ContractTemplatePreset = {
  id: 'tpl-contract',
  title: 'Договор окон',
  tabId: 'contract',
  html: '<div>contract</div>',
  isDefault: true,
  archived: false,
};

const memoPreset: ContractTemplatePreset = {
  id: 'tpl-memo',
  title: 'Памятка',
  tabId: 'memo',
  html: '<div>memo</div>',
  isDefault: true,
  archived: false,
};

describe('resolveLibraryTemplateSelection', () => {
  it('picks memo preset on memo tab', () => {
    const sel = resolveLibraryTemplateSelection([contractPreset, memoPreset], 'WINDOWS', 'memo');
    expect(sel.id).toBe('tpl-memo');
    expect(sel.html).toContain('memo');
    expect(sel.isFallback).toBe(false);
  });

  it('does not pick contract preset when memo tab is active', () => {
    const sel = resolveLibraryTemplateSelection([contractPreset], 'WINDOWS', 'memo');
    expect(sel.id).toBe('');
    expect(sel.isFallback).toBe(true);
    expect(sel.html.length).toBeGreaterThan(10);
  });
});

describe('repairMisassignedWindowsLibraryPresetTabId', () => {
  it('moves titled Памятка from contract to memo tab', () => {
    const fixed = repairMisassignedWindowsLibraryPresetTabId(
      { ...contractPreset, title: 'Памятка' },
      'WINDOWS'
    );
    expect(fixed.tabId).toBe('memo');
  });
});

describe('canAutosaveLibraryTemplatePreset', () => {
  it('blocks autosave when preset tab mismatches active tab', () => {
    expect(canAutosaveLibraryTemplatePreset([contractPreset], 'tpl-contract', 'memo')).toBe(false);
  });

  it('allows autosave when tabs match', () => {
    expect(canAutosaveLibraryTemplatePreset([memoPreset], 'tpl-memo', 'memo')).toBe(true);
  });
});
