import { describe, expect, it } from 'vitest';

import {
  isPackageActTwinOneSheetTab,
  wrapPackageActTwinCopiesOnOnePageHtml,
} from './packageActPrintTabs';

describe('packageActPrintTabs', () => {
  it('uses twin layout for repair act tabs only', () => {
    expect(isPackageActTwinOneSheetTab('actAcceptance', 'REPAIR')).toBe(true);
    expect(isPackageActTwinOneSheetTab('actStart', 'REPAIR')).toBe(true);
    expect(isPackageActTwinOneSheetTab('actAcceptance', 'DOORS')).toBe(false);
    expect(isPackageActTwinOneSheetTab('contract', 'REPAIR')).toBe(false);
  });

  it('wrapPackageActTwinCopiesOnOnePageHtml duplicates body', () => {
    const html = wrapPackageActTwinCopiesOnOnePageHtml('<p>Акт</p>');
    expect(html.match(/<p>Акт<\/p>/g)?.length).toBe(2);
  });
});
