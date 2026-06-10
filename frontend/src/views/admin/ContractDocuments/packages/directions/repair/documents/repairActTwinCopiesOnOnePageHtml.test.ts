import { describe, expect, it } from 'vitest';

import {
  isRepairActTwinOneSheetTab,
  wrapRepairActTwinCopiesOnOnePageHtml,
} from './repairActTwinCopiesOnOnePageHtml';

describe('repairActTwinCopiesOnOnePageHtml', () => {
  it('uses twin layout for repair act tabs only', () => {
    expect(isRepairActTwinOneSheetTab('actAcceptance', 'REPAIR')).toBe(true);
    expect(isRepairActTwinOneSheetTab('actStart', 'REPAIR')).toBe(true);
    expect(isRepairActTwinOneSheetTab('actAcceptance', 'DOORS')).toBe(false);
    expect(isRepairActTwinOneSheetTab('contract', 'REPAIR')).toBe(false);
  });

  it('wrapRepairActTwinCopiesOnOnePageHtml duplicates body', () => {
    const html = wrapRepairActTwinCopiesOnOnePageHtml('<p>Акт</p>');
    expect(html.match(/<p>Акт<\/p>/g)?.length).toBe(2);
  });
});
