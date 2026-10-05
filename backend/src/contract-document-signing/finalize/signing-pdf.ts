import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';

/** Штамп-блок: максимальная ширина и отступы от края страницы (pt). */
const STAMP_MAX_WIDTH = 400;
const STAMP_PADDING = 8;
const STAMP_BOTTOM_MARGIN = 14;
const STAMP_RIGHT_MARGIN = 36;
const STAMP_LINE_HEIGHT = 1.35;
/** Зазор между штампом Подрядчика и штампом Заказчика над ним (pt). */
export const STAMP_STACK_GAP_PT = 10;
/** Синий «штамп»: текст и рамка читаются поверх текста документа. */
const STAMP_BLUE = rgb(0.13, 0.34, 0.82);
const STAMP_BLUE_DARK = rgb(0.09, 0.24, 0.63);

const A4: [number, number] = [595.28, 841.89];
const PROTOCOL_MARGIN = 48;

type FontkitLike = Parameters<PDFDocument['registerFontkit']>[0];

export type StampLine = { text: string; bold?: boolean; size?: number };

export type ContractorStampContext = {
  sessionId: string;
  contractorLabel?: string | null;
  contractorSignatory?: string | null;
  managerName?: string | null;
  sentAt: Date;
  siteUrl: string;
};

export type ProtocolDocumentRow = {
  label: string;
  fileName: string;
  sha256?: string;
  stamped?: boolean;
};

let cachedRegularFont: Buffer | null = null;
let cachedBoldFont: Buffer | null = null;

function fontBytes(kind: 'regular' | 'bold'): Buffer {
  if (kind === 'regular' && cachedRegularFont) return cachedRegularFont;
  if (kind === 'bold' && cachedBoldFont) return cachedBoldFont;
  const file = path.join(
    process.cwd(),
    'assets',
    'fonts',
    `Roboto-${kind === 'regular' ? 'Regular' : 'Bold'}.ttf`,
  );
  const bytes = fs.readFileSync(file);
  if (kind === 'regular') cachedRegularFont = bytes;
  else cachedBoldFont = bytes;
  return bytes;
}

/** Дата/время в московской зоне: «24.09.2026 · 14:33 МСК». */
export function formatMsp(date: Date): string {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${formatted.replace(',', ' ·')} МСК`;
}

export function isPdfBuffer(bytes: Buffer): boolean {
  return bytes.subarray(0, 5).toString('latin1') === '%PDF-';
}

export function uploadsAbsolutePath(fileUrl: string): string {
  return path.join(process.cwd(), fileUrl.replace(/^\/+/, ''));
}

export function uploadsFileUrl(absolutePath: string): string {
  const rel = path.relative(process.cwd(), absolutePath).split(path.sep).join('/');
  return `/${rel}`;
}

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

type EmbeddedFonts = { regular: PDFFont; bold: PDFFont };

async function embedFonts(doc: PDFDocument): Promise<EmbeddedFonts> {
  doc.registerFontkit(fontkit as unknown as FontkitLike);
  // subset: false — полное встраивание TTF: субсеттинг pdf-lib на некоторых
  // просмотрщиках даёт битые глифы кириллицы; размер(±300 КБ/шрифт) некритичен.
  const [regular, bold] = await Promise.all([
    doc.embedFont(fontBytes('regular')),
    doc.embedFont(fontBytes('bold')),
  ]);
  return { regular, bold };
}

type FlatStampLine = { text: string; bold: boolean; size: number };

function flattenStampLines(fonts: EmbeddedFonts, lines: StampLine[]): FlatStampLine[] {
  const flat: FlatStampLine[] = [];
  for (const line of lines) {
    const size = line.size ?? (line.bold ? 8 : 7.4);
    const font = line.bold ? fonts.bold : fonts.regular;
    for (const chunk of wrapText(line.text, font, size, STAMP_MAX_WIDTH - STAMP_PADDING * 2)) {
      flat.push({ text: chunk, bold: !!line.bold, size });
    }
  }
  return flat;
}

function stampBlockMetrics(
  fonts: EmbeddedFonts,
  flat: FlatStampLine[],
): {
  blockWidth: number;
  blockHeight: number;
} {
  const textWidth = flat.length
    ? Math.max(
        ...flat.map((l) => (l.bold ? fonts.bold : fonts.regular).widthOfTextAtSize(l.text, l.size)),
      )
    : 0;
  const blockWidth = Math.min(STAMP_MAX_WIDTH, textWidth + STAMP_PADDING * 2);
  const blockHeight =
    STAMP_PADDING * 2 + flat.reduce((sum, l) => sum + l.size * STAMP_LINE_HEIGHT, 0);
  return { blockWidth, blockHeight };
}

/** Высота блока-штампа (pt) — чтобы поставить второй штамп выше уже нарисованного. */
export async function measureStampBlockHeight(lines: StampLine[]): Promise<number> {
  const doc = await PDFDocument.create();
  const fonts = await embedFonts(doc);
  return stampBlockMetrics(fonts, flattenStampLines(fonts, lines)).blockHeight;
}

/**
 * Нижняя граница блока-штампа: обычно — от нижнего края страницы; при занятой зоне
 * (уже стоит штамп Подрядчика) — выше неё с зазором, но не вылезая за страницу.
 */
export function resolveStampBottomY(
  pageHeight: number,
  blockHeight: number,
  occupiedAbovePt = 0,
): number {
  const y = STAMP_BOTTOM_MARGIN + (occupiedAbovePt > 0 ? occupiedAbovePt + STAMP_STACK_GAP_PT : 0);
  return Math.max(STAMP_BOTTOM_MARGIN, Math.min(y, pageHeight - blockHeight - STAMP_BOTTOM_MARGIN));
}

/** Рисует блок-штамп (как у банков после ЭП) в правом нижнем углу последней страницы. */
function drawStampBlock(
  page: PDFPage,
  fonts: EmbeddedFonts,
  lines: StampLine[],
  occupiedAbovePt = 0,
): void {
  const { width: pageWidth } = page.getSize();

  const flat = flattenStampLines(fonts, lines);
  const { blockWidth, blockHeight } = stampBlockMetrics(fonts, flat);

  const x = Math.max(STAMP_RIGHT_MARGIN, pageWidth - STAMP_RIGHT_MARGIN - blockWidth);
  const y = resolveStampBottomY(page.getHeight(), blockHeight, occupiedAbovePt);

  page.drawRectangle({
    x,
    y,
    width: blockWidth,
    height: blockHeight,
    color: rgb(1, 1, 1),
    // Полупрозрачная подложка: текст документа под штампом остаётся читаемым.
    opacity: 0.3,
    borderColor: STAMP_BLUE,
    borderWidth: 0.8,
    borderOpacity: 0.65,
  });

  let baseline = y + STAMP_PADDING;
  for (const line of flat) {
    baseline += line.size;
    page.drawText(line.text, {
      x: x + STAMP_PADDING,
      y: baseline,
      size: line.size,
      font: line.bold ? fonts.bold : fonts.regular,
      color: line.bold ? STAMP_BLUE_DARK : STAMP_BLUE,
    });
    baseline += line.size * (STAMP_LINE_HEIGHT - 1);
  }
}

/** Наносит штамп на последнюю страницу PDF и возвращает новый буфер. */
export async function stampPdfLastPage(
  buffer: Buffer,
  lines: StampLine[],
  opts?: { aboveHeightPt?: number },
): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const fonts = await embedFonts(doc);
  const page = doc.getPage(doc.getPageCount() - 1);
  drawStampBlock(page, fonts, lines, opts?.aboveHeightPt ?? 0);
  return Buffer.from(await doc.save());
}

function hostOf(siteUrl: string): string {
  try {
    return new URL(siteUrl).host;
  } catch {
    return 'territory-interior.ru';
  }
}

export function contractorStampLines(ctx: ContractorStampContext): StampLine[] {
  const lines: StampLine[] = [
    {
      text: 'Подписано со стороны Подрядчика простой электронной подписью (ПЭП)',
      bold: true,
      size: 8,
    },
  ];
  if (ctx.contractorLabel) {
    lines.push({ text: `Подрядчик: ${ctx.contractorLabel}`, bold: true });
  }
  if (ctx.contractorSignatory) {
    lines.push({ text: `Подписант: ${ctx.contractorSignatory}` });
  }
  if (ctx.managerName) {
    lines.push({ text: `Менеджер: ${ctx.managerName}` });
  }
  lines.push({
    text: `Дата и время (МСК): ${formatMsp(ctx.sentAt)} · Сессия ЭП № ${ctx.sessionId.slice(0, 8).toUpperCase()}`,
  });
  lines.push({
    text: `Документ направлен Заказчику для подписания ПЭП на сайте ${hostOf(ctx.siteUrl)} (п. 7.5–7.10 договора)`,
  });
  return lines;
}

export function customerStampLines(input: {
  signedName: string;
  signedAt: Date;
  packageTitle: string;
  sessionId: string;
  siteUrl: string;
}): StampLine[] {
  return [
    { text: 'Подписано простой электронной подписью (ПЭП)', bold: true, size: 8 },
    { text: `Заказчик (подписант): ${input.signedName}`, bold: true },
    {
      text: `Дата и время подписания (МСК): ${formatMsp(input.signedAt)} · Сессия ЭП № ${input.sessionId.slice(0, 8).toUpperCase()}`,
    },
    { text: `Договор: ${input.packageTitle}` },
    {
      text: `Подписание подтверждено вводом ФИО и одноразового кода на сайте ${hostOf(input.siteUrl)} (п. 7.5–7.10 договора)`,
    },
  ];
}

/** Лист-протокол подписания: реквизиты события, состав документов, хэши. */
export async function buildProtocolPdf(input: {
  siteUrl: string;
  packageTitle: string;
  sessionId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  contractorLabel?: string | null;
  contractorSignatory?: string | null;
  signedName?: string | null;
  createdAt: Date;
  viewedAt?: Date | null;
  signedAt?: Date | null;
  signedIp?: string | null;
  signedUserAgent?: string | null;
  documents: ProtocolDocumentRow[];
}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle('Протокол электронного подписания документов');
  doc.setProducer(hostOf(input.siteUrl));
  const fonts = await embedFonts(doc);

  const gray = rgb(0.35, 0.35, 0.35);
  const black = rgb(0.1, 0.1, 0.1);

  let page = doc.addPage(A4);
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y - needed < PROTOCOL_MARGIN + 40) {
      page = doc.addPage(A4);
      y = page.getHeight() - PROTOCOL_MARGIN;
    }
  };

  // Заголовок
  const title = 'ПРОТОКОЛ ЭЛЕКТРОННОГО ПОДПИСАНИЯ ДОКУМЕНТОВ';
  const titleSize = 13;
  page.drawText(title, {
    x: (page.getWidth() - fonts.bold.widthOfTextAtSize(title, titleSize)) / 2,
    y: page.getHeight() - PROTOCOL_MARGIN - titleSize,
    size: titleSize,
    font: fonts.bold,
    color: black,
  });
  y = page.getHeight() - PROTOCOL_MARGIN - titleSize - 14;

  const subtitle = `Сформирован автоматически на сайте ${hostOf(input.siteUrl)} · Простая электронная подпись (ПЭП), п. 7.5–7.10 договора`;
  for (const line of wrapText(
    subtitle,
    fonts.regular,
    8.4,
    page.getWidth() - PROTOCOL_MARGIN * 2,
  )) {
    page.drawText(line, {
      x: (page.getWidth() - fonts.regular.widthOfTextAtSize(line, 8.4)) / 2,
      y: y - 8.4,
      size: 8.4,
      font: fonts.regular,
      color: gray,
    });
    y -= 8.4 + 3;
  }
  y -= 12;

  const sections: Array<[string, string | null]> = [
    ['Договор:', input.packageTitle],
    ['Подрядчик:', input.contractorLabel ?? null],
    ['Подписант Подрядчика:', input.contractorSignatory ?? null],
    [
      'Заказчик:',
      input.customerName
        ? [input.customerName, input.customerPhone, input.customerEmail].filter(Boolean).join(' · ')
        : null,
    ],
    ['Подписант Заказчика (ПЭП):', input.signedName ?? null],
    ['Документы направлены:', formatMsp(input.createdAt)],
    ['Заказчик открыл документы:', input.viewedAt ? formatMsp(new Date(input.viewedAt)) : null],
    ['Документы подписаны:', input.signedAt ? formatMsp(new Date(input.signedAt)) : null],
    [
      'Технические данные подписания:',
      [input.signedIp ? `IP ${input.signedIp}` : null, input.signedUserAgent?.slice(0, 180) ?? null]
        .filter(Boolean)
        .join(' · ') || null,
    ],
    ['Сессия ЭП №:', input.sessionId.slice(0, 8).toUpperCase()],
  ];

  for (const [label, value] of sections) {
    if (!value) continue;
    const size = 9;
    const wrapped = wrapText(value, fonts.regular, size, 420);
    ensureSpace(size * 1.5 * wrapped.length + 6);
    let labelX = PROTOCOL_MARGIN;
    page.drawText(label, { x: labelX, y: y - size, size, font: fonts.bold, color: black });
    labelX += fonts.bold.widthOfTextAtSize(`${label} `, size);
    let ty = y - size;
    for (const line of wrapped) {
      page.drawText(line, { x: labelX, y: ty, size, font: fonts.regular, color: black });
      ty -= size + 2;
    }
    y = Math.min(ty, y - size - 2) - 6;
  }

  // Таблица документов
  y -= 6;
  ensureSpace(60);
  page.drawText('Состав документов сессии:', {
    x: PROTOCOL_MARGIN,
    y: y - 9,
    size: 9,
    font: fonts.bold,
    color: black,
  });
  y -= 9 + 8;

  const cols: Array<{ x: number; width: number; title: string }> = [
    { x: 0, width: 18, title: '№' },
    { x: 18, width: 168, title: 'Документ' },
    { x: 186, width: 110, title: 'Файл' },
    { x: 296, width: 203, title: 'SHA-256 (содержимое, направленное Заказчику)' },
  ];
  const drawTableHeader = () => {
    page.drawText(cols[0].title, {
      x: PROTOCOL_MARGIN,
      y: y - 8,
      size: 8,
      font: fonts.bold,
      color: gray,
    });
    page.drawText(cols[1].title, {
      x: PROTOCOL_MARGIN + cols[1].x,
      y: y - 8,
      size: 8,
      font: fonts.bold,
      color: gray,
    });
    page.drawText(cols[2].title, {
      x: PROTOCOL_MARGIN + cols[2].x,
      y: y - 8,
      size: 8,
      font: fonts.bold,
      color: gray,
    });
    for (const line of wrapText(cols[3].title, fonts.bold, 8, cols[3].width)) {
      page.drawText(line, {
        x: PROTOCOL_MARGIN + cols[3].x,
        y: y - 8,
        size: 8,
        font: fonts.bold,
        color: gray,
      });
      y -= 10;
    }
    y -= 2;
  };
  drawTableHeader();

  input.documents.forEach((row, index) => {
    const cellSize = 8;
    const labelLines = wrapText(row.label, fonts.regular, cellSize, cols[1].width - 6);
    const fileLines = wrapText(row.fileName, fonts.regular, cellSize, cols[2].width - 6);
    const hashLines = row.sha256 ? wrapText(row.sha256, fonts.regular, 6.6, cols[3].width) : ['—'];
    const extraLine = row.stamped === false ? 'направлен в исходном виде (не PDF)' : null;
    const rowHeight =
      Math.max(labelLines.length, fileLines.length, hashLines.length) * (cellSize + 2) +
      (extraLine ? cellSize + 2 : 0) +
      6;
    ensureSpace(rowHeight);

    page.drawText(String(index + 1), {
      x: PROTOCOL_MARGIN,
      y: y - cellSize,
      size: cellSize,
      font: fonts.regular,
      color: black,
    });
    let ty = y - cellSize;
    for (const line of labelLines) {
      page.drawText(line, {
        x: PROTOCOL_MARGIN + cols[1].x,
        y: ty,
        size: cellSize,
        font: fonts.regular,
        color: black,
      });
      ty -= cellSize + 2;
    }
    ty = y - cellSize;
    for (const line of fileLines) {
      page.drawText(line, {
        x: PROTOCOL_MARGIN + cols[2].x,
        y: ty,
        size: cellSize,
        font: fonts.regular,
        color: black,
      });
      ty -= cellSize + 2;
    }
    ty = y - cellSize;
    for (const line of hashLines) {
      page.drawText(line, {
        x: PROTOCOL_MARGIN + cols[3].x,
        y: ty,
        size: 6.6,
        font: fonts.regular,
        color: gray,
      });
      ty -= 6.6 + 2;
    }
    if (extraLine) {
      page.drawText(extraLine, {
        x: PROTOCOL_MARGIN + cols[3].x,
        y: ty,
        size: 6.6,
        font: fonts.regular,
        color: gray,
      });
    }
    y -= rowHeight;
    page.drawLine({
      start: { x: PROTOCOL_MARGIN, y: y + 4 },
      end: { x: page.getWidth() - PROTOCOL_MARGIN, y: y + 4 },
      thickness: 0.4,
      color: rgb(0.85, 0.85, 0.85),
    });
  });

  // Правовая ссылка
  y -= 14;
  const footer =
    'Документы, указанные в настоящем протоколе, подписаны простой электронной подписью Заказчика в порядке п. 7.5–7.10 договора: ' +
    'открытие персональной ссылки, ознакомление с электронными документами, ввод ФИО и одноразового кода подтверждения, согласие с условиями. ' +
    'На PDF-файлах комплекта проставлены отметки (штампы) о подписании с датой и временем. ' +
    'Подписанный комплект хранится на сайте и может быть предоставлен любой из сторон.';
  for (const line of wrapText(footer, fonts.regular, 8, page.getWidth() - PROTOCOL_MARGIN * 2)) {
    ensureSpace(12);
    page.drawText(line, {
      x: PROTOCOL_MARGIN,
      y: y - 8,
      size: 8,
      font: fonts.regular,
      color: gray,
    });
    y -= 8 + 3;
  }

  return Buffer.from(await doc.save());
}

/** Склеивает несколько PDF в один (страницы копируются 1:1). */
export async function mergePdfBuffers(buffers: Buffer[], title?: string): Promise<Buffer> {
  const out = await PDFDocument.create();
  if (title) out.setTitle(title);
  for (const buffer of buffers) {
    const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copied = await out.copyPages(src, src.getPageIndices());
    for (const page of copied) out.addPage(page);
  }
  return Buffer.from(await out.save());
}
