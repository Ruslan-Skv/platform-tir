const PRINT_STYLES = `
  @page { margin: 16mm; size: A4; }
  html, body { margin: 0; padding: 0; font-family: "Times New Roman", Times, serif; color: #111; }
  .docPrint { font-size: 12pt; line-height: 1.45; }
  .docPrint a { color: #111 !important; text-decoration: none; }
  .docPrint h1 { font-size: 14pt; text-align: center; margin: 0 0 12pt; }
  .docPrint h2 { font-size: 12pt; margin: 14pt 0 6pt; }
  .docPrint p { margin: 0 0 8pt; }
  .signTable { width: 100%; border-collapse: collapse; margin-top: 18pt; }
  .signTable td { width: 50%; vertical-align: bottom; padding: 6pt; }
  .estimatePre {
    white-space: pre-wrap;
    font-family: inherit;
    background: #f9fafb;
    padding: 10pt;
    border: 1px solid #e5e7eb;
    margin: 0;
  }
  .contractRequisitesBlock strong,
  .contractRequisitesBlock em {
    font-weight: normal !important;
    font-style: normal !important;
  }
`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Открывает окно только с содержимым вкладки и вызывает диалог печати (без шапки админки). */
export function printDocumentHtml(innerHtml: string, documentTitle: string): void {
  const w = window.open('', '_blank');
  if (!w) {
    window.alert('Разрешите всплывающие окна для печати этого документа.');
    return;
  }
  const title = escapeHtml(documentTitle);
  w.document.open();
  w.document
    .write(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>${title}</title>
    <style>${PRINT_STYLES}</style></head><body>${innerHtml}</body></html>`);
  w.document.close();
  w.focus();
  window.setTimeout(() => {
    w.print();
    w.close();
  }, 200);
}
