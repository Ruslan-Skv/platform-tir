import { buildDocumentPdfBlob } from '../../../../core/printDocument';
import { rtfToHtml } from './rtfToHtml';

/**
 * Конвертация прикреплённой RTF-спецификации в PDF (через печатный пайплайн):
 * превью/печать/отправка подписания работают по обычному PDF-пути.
 * Возвращает null, если RTF не удалось разобрать или собрать PDF.
 */
export async function convertRtfSpecificationToPdf(
  rtf: Blob,
  documentTitle: string
): Promise<File | null> {
  try {
    const html = rtfToHtml(await rtf.text()).trim();
    if (!html) return null;
    const printHtml = `<div class="docPrint estimateA4DocPrintEmbed"><div class="windowsSpecRtfHolder windowsSpecRtfContent">${html}</div></div>`;
    const pdfName = documentTitle.replace(/\.rtf$/i, '') + '.pdf';
    const { blob } = await buildDocumentPdfBlob(printHtml, documentTitle, pdfName, {
      contractCompact: true,
    });
    return new File([blob], pdfName, { type: 'application/pdf' });
  } catch {
    return null;
  }
}
