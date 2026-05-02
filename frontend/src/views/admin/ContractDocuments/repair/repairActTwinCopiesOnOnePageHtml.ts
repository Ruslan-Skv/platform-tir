/** Вкладки пакета ремонта: два экземпляра акта на одном листе A4. */
export function isRepairActTwinOneSheetTab(tab: string): boolean {
  return tab === 'actStart' || tab === 'actAcceptance';
}

/** ПКО и «двойные» акты: `customer.*` без авто-обёртки в жирный/курсив в `applyTemplate`. */
export function isRepairPlainCustomerTab(tab: string): boolean {
  return isRepairActTwinOneSheetTab(tab) || tab === 'cashOrder';
}

/**
 * Два экземпляра акта на одном листе A4 (акты начала работ и приёмки): две строки с горизонтальным разделителем.
 * Inline-стили — чтобы то же HTML корректно смотрелось в окне печати без module CSS.
 */
export function wrapRepairActTwinCopiesOnOnePageHtml(renderedDocHtml: string): string {
  return `<div style="display:flex;flex-direction:column;width:100%;box-sizing:border-box;align-items:stretch;gap:0;">
<div style="min-width:0">${renderedDocHtml}</div>
<div style="height:4px;margin:12px 0;background:#9ca3af;border-radius:2px;flex-shrink:0;width:100%;box-sizing:border-box" role="separator" aria-hidden="true"></div>
<div style="min-width:0">${renderedDocHtml}</div>
</div>`;
}
