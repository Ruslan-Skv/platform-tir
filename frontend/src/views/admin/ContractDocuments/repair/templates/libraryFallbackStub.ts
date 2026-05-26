/** Заглушка, если в библиотеке нет пресета для вкладки. */
export function repairLibraryFallbackStub(documentTitle: string): string {
  return `<div class="docPrint"><p><strong>${documentTitle}</strong></p><p>Настройте шаблон в разделе «Библиотека шаблонов договоров» (Оформление договоров).</p></div>`;
}
