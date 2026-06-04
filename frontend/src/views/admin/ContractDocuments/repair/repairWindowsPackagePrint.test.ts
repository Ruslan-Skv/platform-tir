import { describe, expect, it } from 'vitest';

import { buildEstimateSheetPrintHtml } from './repairEstimateDocPrintEmbedHtml';
import {
  pickWindowsPackagePrintDocumentOptions,
  shouldUseWindowsPackageCompactPrint,
  wrapEstimateSheetHtmlForWindowsPrint,
} from './repairWindowsPackagePrint';

describe('repairWindowsPackagePrint', () => {
  it('enables compact print for customer-facing WINDOWS tabs', () => {
    expect(shouldUseWindowsPackageCompactPrint('WINDOWS', 'contract')).toBe(true);
    expect(shouldUseWindowsPackageCompactPrint('WINDOWS', 'finalEstimate')).toBe(true);
    expect(shouldUseWindowsPackageCompactPrint('WINDOWS', 'estimate')).toBe(true);
    expect(shouldUseWindowsPackageCompactPrint('WINDOWS', 'actAcceptance')).toBe(true);
    expect(shouldUseWindowsPackageCompactPrint('WINDOWS', 'memo')).toBe(true);
    expect(shouldUseWindowsPackageCompactPrint('WINDOWS', 'addendum1')).toBe(true);
  });

  it('skips compact print for service WINDOWS tabs', () => {
    expect(shouldUseWindowsPackageCompactPrint('WINDOWS', 'data')).toBe(false);
    expect(shouldUseWindowsPackageCompactPrint('WINDOWS', 'payments')).toBe(false);
    expect(shouldUseWindowsPackageCompactPrint('REPAIR', 'contract')).toBe(false);
  });

  it('returns unified print options with margin footer only for contract', () => {
    expect(pickWindowsPackagePrintDocumentOptions('memo', null)).toEqual({
      contractCompact: true,
      windowsPackagePrint: true,
    });
    expect(pickWindowsPackagePrintDocumentOptions('contract', null).marginFooter).toBeDefined();
  });

  it('wraps estimate sheet HTML for print stylesheet', () => {
    expect(wrapEstimateSheetHtmlForWindowsPrint('<p>x</p>')).toContain(
      'windowsPackageUnifiedPrint'
    );
    expect(wrapEstimateSheetHtmlForWindowsPrint('<p>x</p>')).toContain('estimateA4DocPrintEmbed');
  });

  it('builds windows estimate sheet with table columns, signatures and note lines', () => {
    const html = buildEstimateSheetPrintHtml({
      variant: 'windows',
      appendixNumber: 2,
      contractNum: '1',
      contractDate: '01.01.2025',
      sections: [
        {
          categoryName: 'Монтаж',
          rooms: [
            {
              name: 'Кухня',
              total: 1000,
              lines: [
                {
                  name: 'Работа',
                  unit: 'м²',
                  quantity: 1,
                  price: 1000,
                  amount: 1000,
                },
              ],
            },
          ],
        },
      ],
      snapshot: {
        rooms: [
          {
            name: 'Кухня',
            total: 1000,
            lines: [{ name: 'Работа', unit: 'м²', quantity: 1, price: 1000, amount: 1000 }],
          },
        ],
        total: 1000,
      },
      directorName: 'Иванов',
      customerFullName: 'Петров',
      docPrintRootClass: 'windowsPackageUnifiedPrint',
    });
    expect(html).toContain('estimateA4Table');
    expect(html).toContain('Счёт-заказ на работы');
    expect(html).toContain('estimateA4SignaturesTable');
    expect(html).toContain('estimateA4HandwritingLine');
    expect(html).toContain('Исполнитель');
  });
});
