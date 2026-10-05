import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import {
  type SigningSessionDocumentMeta,
  isUnsignedSigningAttachment,
} from '../signing-session-documents';
import {
  type ContractorStampContext,
  type ProtocolDocumentRow,
  buildProtocolPdf,
  contractorStampLines,
  customerStampLines,
  isPdfBuffer,
  measureStampBlockHeight,
  mergePdfBuffers,
  stampPdfLastPage,
  uploadsAbsolutePath,
  uploadsFileUrl,
} from './signing-pdf';

export type { ContractorStampContext } from './signing-pdf';

export type SignedArtifactsInput = {
  sessionId: string;
  documents: SigningSessionDocumentMeta[];
  packageTitle: string;
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
  siteUrl: string;
};

export type SignedArtifactsResult = {
  documents: SigningSessionDocumentMeta[];
  signedPackageUrl: string;
  packageBuffer: Buffer;
};

/**
 * Резерв под строку «Менеджер: …» в штампе Подрядчика: имя менеджера в сессии не
 * хранится, поэтому при оценке высоты уже стоящего штампа добавляем строку сверху.
 */
const MANAGER_LINE_RESERVE_PT = 14;

/** Проставляет документы сессии штамп ПЭП Подрядчика (перед отправкой Заказчику) и фиксирует SHA-256. */
@Injectable()
export class SigningStampService {
  private readonly logger = new Logger(SigningStampService.name);

  async applyContractorStamps(
    documents: SigningSessionDocumentMeta[],
    ctx: ContractorStampContext,
  ): Promise<SigningSessionDocumentMeta[]> {
    const result: SigningSessionDocumentMeta[] = [];
    for (const doc of documents) {
      const absolutePath = uploadsAbsolutePath(doc.fileUrl);
      let bytes: Buffer | null = null;
      try {
        bytes = fs.readFileSync(absolutePath);
      } catch {
        this.logger.warn(`Файл сессии не найден: ${doc.fileUrl}`);
      }
      if (!bytes) {
        result.push({ ...doc, stamped: false });
        continue;
      }
      if (isUnsignedSigningAttachment(doc)) {
        // Справочное вложение (карточка реквизитов) ЭП не подписывается —
        // фиксируем только хэш направленного Заказчику содержимого.
        result.push({ ...doc, stamped: false, sha256: sha256Hex(bytes) });
        continue;
      }
      if (isPdfBuffer(bytes)) {
        try {
          const stamped = await stampPdfLastPage(bytes, contractorStampLines(ctx));
          fs.writeFileSync(absolutePath, stamped);
          result.push({ ...doc, stamped: true, sha256: sha256Hex(stamped) });
        } catch (err) {
          this.logger.error(
            `Не удалось проставить штамп Подрядчика на ${doc.fileUrl}: ${(err as Error).message}`,
          );
          result.push({ ...doc, stamped: false, sha256: sha256Hex(bytes) });
        }
      } else {
        // Внешние файлы (не PDF) штампом не снабжаются — фиксируем хэш исходника.
        result.push({ ...doc, stamped: false, sha256: sha256Hex(bytes) });
      }
    }
    return result;
  }

  /**
   * Финализация подписанной сессии: копии с отметкой Заказчика, лист-протокол,
   * единый PDF-комплект. Оригиналы не изменяются.
   */
  async buildSignedArtifacts(input: SignedArtifactsInput): Promise<SignedArtifactsResult> {
    const signedDir = path.join(
      process.cwd(),
      'uploads',
      'contract-document-packages',
      'signing',
      input.sessionId,
      'signed',
    );
    fs.mkdirSync(signedDir, { recursive: true });

    const documents: SigningSessionDocumentMeta[] = [];
    const stampedPdfBuffers: Buffer[] = [];
    const protocolRows: ProtocolDocumentRow[] = [];

    // Отметка Заказчика ставится выше штампа Подрядчика, уже стоящего на отправленных
    // PDF, — иначе штампы накладываются друг на друга в правом нижнем углу. Высоту
    // оцениваем тем же алгоритмом вёрстки; имя менеджера не хранится — учитываем резервом.
    const contractorStampHeight =
      (await measureStampBlockHeight(
        contractorStampLines({
          sessionId: input.sessionId,
          contractorLabel: input.contractorLabel,
          contractorSignatory: input.contractorSignatory,
          managerName: null,
          sentAt: input.createdAt,
          siteUrl: input.siteUrl,
        }),
      )) + MANAGER_LINE_RESERVE_PT;

    for (let i = 0; i < input.documents.length; i++) {
      const doc = input.documents[i]!;
      if (isUnsignedSigningAttachment(doc)) {
        // Справочное вложение (карточка реквизитов) не подписывается ЭП:
        // без отметки Заказчика, без строки в протоколе и без копии в комплекте.
        documents.push({ ...doc });
        continue;
      }
      protocolRows.push({
        label: doc.label,
        fileName: doc.fileName,
        sha256: doc.sha256,
        stamped: doc.stamped,
      });
      try {
        const bytes = fs.readFileSync(uploadsAbsolutePath(doc.fileUrl));
        if (!isPdfBuffer(bytes)) {
          documents.push({ ...doc });
          continue;
        }
        const stamped = await stampPdfLastPage(
          bytes,
          customerStampLines({
            signedName: input.signedName?.trim() || 'Заказчик',
            signedAt: input.signedAt ?? input.createdAt,
            packageTitle: input.packageTitle,
            sessionId: input.sessionId,
            siteUrl: input.siteUrl,
          }),
          // Штамп Подрядчика есть только на документах, доштампованных при отправке.
          doc.stamped ? { aboveHeightPt: contractorStampHeight } : undefined,
        );
        const safeTab = (doc.tabId || 'doc').replace(/[^\w-]+/g, '_').slice(0, 40);
        const fileName = `${i}_${safeTab}.pdf`;
        fs.writeFileSync(path.join(signedDir, fileName), stamped);
        stampedPdfBuffers.push(stamped);
        documents.push({ ...doc, signedFileUrl: uploadsFileUrl(path.join(signedDir, fileName)) });
      } catch (err) {
        this.logger.error(
          `Не удалось создать подписанную копию для ${doc.fileUrl}: ${(err as Error).message}`,
        );
        documents.push({ ...doc });
      }
    }

    const protocol = await buildProtocolPdf({
      siteUrl: input.siteUrl,
      packageTitle: input.packageTitle,
      sessionId: input.sessionId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      contractorLabel: input.contractorLabel,
      contractorSignatory: input.contractorSignatory,
      signedName: input.signedName,
      createdAt: input.createdAt,
      viewedAt: input.viewedAt,
      signedAt: input.signedAt,
      signedIp: input.signedIp,
      signedUserAgent: input.signedUserAgent,
      documents: protocolRows,
    });

    const packageBuffer = await mergePdfBuffers(
      [protocol, ...stampedPdfBuffers],
      `Подписанный комплект — ${input.packageTitle}`,
    );
    const packageFileName = `Podpisannyy_komplekt_${input.sessionId.slice(0, 8)}.pdf`;
    const packagePath = path.join(signedDir, packageFileName);
    fs.writeFileSync(packagePath, packageBuffer);

    return {
      documents,
      signedPackageUrl: uploadsFileUrl(packagePath),
      packageBuffer,
    };
  }
}

function sha256Hex(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
