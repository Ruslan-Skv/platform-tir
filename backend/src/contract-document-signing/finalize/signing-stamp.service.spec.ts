import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';

import { SigningStampService } from './signing-stamp.service';
import {
  buildProtocolPdf,
  formatMsp,
  isPdfBuffer,
  mergePdfBuffers,
  stampPdfLastPage,
  uploadsFileUrl,
} from './signing-pdf';
import type { SigningSessionDocumentMeta } from '../signing-session-documents';

async function makePdf(pages: number, textOnEachPage?: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    fs.readFileSync(path.join(process.cwd(), 'assets', 'fonts', 'Roboto-Regular.ttf')),
  );
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([595.28, 841.89]);
    if (textOnEachPage) {
      page.drawText(`${textOnEachPage} ${i + 1}`, { x: 40, y: 800, size: 12, font });
    }
  }
  return Buffer.from(await doc.save());
}

describe('signing-stamp helpers', () => {
  it('formatMsp форматирует в московском времени', () => {
    expect(formatMsp(new Date('2026-09-28T10:00:00Z'))).toBe('28.09.2026 · 13:00 МСК');
  });

  it('isPdfBuffer распознаёт PDF по magic bytes', () => {
    expect(isPdfBuffer(Buffer.from('%PDF-1.7\n...'))).toBe(true);
    expect(isPdfBuffer(Buffer.from('{\\rtf1 ...'))).toBe(false);
  });

  it('mergePdfBuffers склеивает документы постранично', async () => {
    const merged = await mergePdfBuffers([await makePdf(2), await makePdf(1)]);
    const doc = await PDFDocument.load(merged);
    expect(doc.getPageCount()).toBe(3);
  });

  it('stampPdfLastPage наносит штамп, сохраняя страницы и валидность PDF', async () => {
    const original = await makePdf(2, 'Документ');
    const stamped = await stampPdfLastPage(original, [
      {
        text: 'Подписано со стороны Подрядчика простой электронной подписью (ПЭП)',
        bold: true,
        size: 8,
      },
      { text: 'Подрядчик: ООО «Территория интерьера», ИНН 7712345678', bold: true },
      { text: 'Дата и время (МСК): 28.09.2026 · 13:00 МСК · Сессия ЭП № ABCD1234' },
    ]);
    const doc = await PDFDocument.load(stamped);
    expect(doc.getPageCount()).toBe(2);
    // Полное встраивание шрифта делает файл ощутимо больше исходного.
    expect(stamped.length).toBeGreaterThan(original.length + 100_000);
  });

  it('buildProtocolPdf формирует валидный PDF на 1+ страницах', async () => {
    const protocol = await buildProtocolPdf({
      siteUrl: 'https://territory-interior.ru',
      packageTitle: 'Договор ремонтных работ № 77/1/3д-5',
      sessionId: 'abcd1234efgh',
      customerName: 'Сидоров Сергей Петрович',
      customerPhone: '+7 (900) 123-45-67',
      contractorLabel: 'ООО «Территория интерьера», ИНН 7712345678',
      contractorSignatory: 'Иванов Иван Иванович, директор',
      signedName: 'Сидоров Сергей Петрович',
      createdAt: new Date('2026-09-28T10:00:00Z'),
      viewedAt: new Date('2026-09-28T11:30:00Z'),
      signedAt: new Date('2026-09-28T12:03:00Z'),
      signedIp: '91.132.10.5',
      signedUserAgent: 'Mozilla/5.0 Chrome/129',
      documents: [
        {
          label: 'Договор подряда',
          fileName: 'contract.pdf',
          sha256: 'a'.repeat(64),
          stamped: true,
        },
        { label: 'Спецификация', fileName: 'spec.rtf', sha256: 'b'.repeat(64), stamped: false },
      ],
    });
    const doc = await PDFDocument.load(protocol);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});

describe('SigningStampService (файлы)', () => {
  const service = new SigningStampService();
  const sessionId = 'jestsession12345';
  const testRoot = path.join(
    process.cwd(),
    'uploads',
    'contract-document-packages',
    'signing',
    'jest-stamp-spec',
  );

  beforeAll(() => {
    fs.mkdirSync(testRoot, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testRoot, { recursive: true, force: true });
    fs.rmSync(path.join(path.dirname(testRoot), sessionId), { recursive: true, force: true });
  });

  it('applyContractorStamps штампует PDF (на диске) и хэширует внешние файлы', async () => {
    const pdfPath = path.join(testRoot, 'contract.pdf');
    const originalPdf = await makePdf(1, 'Договор');
    fs.writeFileSync(pdfPath, originalPdf);
    const rtfPath = path.join(testRoot, 'spec.rtf');
    fs.writeFileSync(rtfPath, Buffer.from('{\\rtf1ansi spec}'));

    const docs: SigningSessionDocumentMeta[] = [
      {
        tabId: 'contract',
        label: 'Договор',
        fileUrl: uploadsFileUrl(pdfPath),
        fileName: 'contract.pdf',
      },
      {
        tabId: 'specification',
        label: 'Спецификация',
        fileUrl: uploadsFileUrl(rtfPath),
        fileName: 'spec.rtf',
      },
    ];

    const result = await service.applyContractorStamps(docs, {
      sessionId,
      contractorLabel: 'ООО «Территория интерьера», ИНН 7712345678',
      contractorSignatory: 'Иванов Иван Иванович, директор',
      managerName: 'Петрова Анна',
      sentAt: new Date('2026-09-28T10:00:00Z'),
      siteUrl: 'https://territory-interior.ru',
    });

    // PDF: проштампован на диске, sha256 соответствует новому содержимому.
    expect(result[0]!.stamped).toBe(true);
    const stampedOnDisk = fs.readFileSync(pdfPath);
    expect(result[0]!.sha256).toBe(crypto.createHash('sha256').update(stampedOnDisk).digest('hex'));
    expect(isPdfBuffer(stampedOnDisk)).toBe(true);
    expect(stampedOnDisk.equals(originalPdf)).toBe(false);
    expect((await PDFDocument.load(stampedOnDisk)).getPageCount()).toBe(1);

    // Не-PDF: файл не тронут, хэш исходника.
    expect(result[1]!.stamped).toBe(false);
    expect(result[1]!.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(fs.readFileSync(rtfPath).toString()).toBe('{\\rtf1ansi spec}');
  });

  it('buildSignedArtifacts создаёт копии с отметкой, протокол и единый комплект', async () => {
    const pdfPath = path.join(testRoot, 'contract.pdf');
    const rtfPath = path.join(testRoot, 'spec.rtf');
    if (!fs.existsSync(pdfPath)) fs.writeFileSync(pdfPath, await makePdf(1, 'Договор'));
    if (!fs.existsSync(rtfPath)) fs.writeFileSync(rtfPath, Buffer.from('{\\rtf1ansi spec}'));

    const docs: SigningSessionDocumentMeta[] = [
      {
        tabId: 'contract',
        label: 'Договор',
        fileUrl: uploadsFileUrl(pdfPath),
        fileName: 'contract.pdf',
      },
      {
        tabId: 'specification',
        label: 'Спецификация',
        fileUrl: uploadsFileUrl(rtfPath),
        fileName: 'spec.rtf',
      },
    ];

    const input = {
      sessionId,
      documents: docs,
      packageTitle: 'Договор ремонтных работ № 77/1/3д-5',
      customerName: 'Сидоров Сергей Петрович',
      contractorLabel: 'ООО «Территория интерьера», ИНН 7712345678',
      signedName: 'Сидоров Сергей Петрович',
      createdAt: new Date('2026-09-28T10:00:00Z'),
      signedAt: new Date('2026-09-28T12:03:00Z'),
      signedIp: '91.132.10.5',
      siteUrl: 'https://territory-interior.ru',
    } as const;

    const first = await service.buildSignedArtifacts(input);

    expect(first.documents[0]!.signedFileUrl).toMatch(
      /\/uploads\/contract-document-packages\/signing\/jestsession12345\/signed\/0_contract\.pdf$/,
    );
    expect(first.documents[1]!.signedFileUrl).toBeUndefined();
    expect(first.signedPackageUrl).toMatch(/Podpisannyy_komplekt_jestsess\.pdf$/);
    expect(fs.existsSync(path.join(process.cwd(), first.signedPackageUrl.replace(/^\//, '')))).toBe(
      true,
    );

    // Комплект: лист-протокол (стр. 1) + штампованная копия PDF (стр. 2).
    const packageDoc = await PDFDocument.load(first.packageBuffer);
    expect(packageDoc.getPageCount()).toBe(2);

    // Оригинал на диске не изменился после финализации.
    const originalAfter = fs.readFileSync(pdfPath);
    const signedCopy = fs.readFileSync(
      path.join(process.cwd(), first.documents[0]!.signedFileUrl!.replace(/^\//, '')),
    );
    expect(signedCopy.equals(originalAfter)).toBe(false);

    // Идемпотентность: повторная генерация даёт те же пути.
    const second = await service.buildSignedArtifacts(input);
    expect(second.signedPackageUrl).toBe(first.signedPackageUrl);
    expect(second.documents[0]!.signedFileUrl).toBe(first.documents[0]!.signedFileUrl);
  });
});
