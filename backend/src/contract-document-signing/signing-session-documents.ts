import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type SigningSessionDocumentMeta = {
  tabId: string;
  label: string;
  fileUrl: string;
  fileName: string;
};

const BLOCKED_FILE_EXTENSIONS =
  /\.(exe|bat|cmd|com|msi|scr|dll|vbs|ps1|sh|jar|cpl|inf|reg|hta|msc|lnk|pif)$/i;

function safeFileExtension(originalname: string): string {
  const match = /\.([a-z0-9]{1,8})$/i.exec(originalname.trim());
  return match ? `.${match[1]!.toLowerCase()}` : '';
}

function ensureUploadDir(): string {
  const dir = path.join(process.cwd(), 'uploads', 'contract-document-packages', 'signing');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Сохраняет загруженные файлы (PDF из шаблонов + внешние вложения) и возвращает метаданные документов. */
export function persistSigningSessionDocuments(
  packageId: string,
  metas: Array<{ tabId: string; label: string; isExternalFile?: boolean }>,
  files: Express.Multer.File[],
): SigningSessionDocumentMeta[] {
  if (!metas.length) {
    throw new BadRequestException('Выберите хотя бы один документ');
  }
  if (files.length !== metas.length) {
    throw new BadRequestException('Число файлов должно совпадать с числом документов');
  }
  const dir = ensureUploadDir();
  const out: SigningSessionDocumentMeta[] = [];
  for (let i = 0; i < metas.length; i++) {
    const meta = metas[i]!;
    const file = files[i]!;
    const isPdf =
      file.mimetype?.includes('pdf') || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      if (!meta.isExternalFile) {
        throw new BadRequestException(`Файл «${file.originalname}» должен быть PDF`);
      }
      if (BLOCKED_FILE_EXTENSIONS.test(file.originalname)) {
        throw new BadRequestException(`Тип файла «${file.originalname}» запрещён`);
      }
    }
    const safeTab = (meta.tabId || 'doc').replace(/[^\w-]+/g, '_').slice(0, 40);
    const ext = isPdf ? '.pdf' : safeFileExtension(file.originalname);
    const filename = `${packageId}_${Date.now()}_${i}_${safeTab}${ext}`;
    const fullPath = path.join(dir, filename);
    fs.writeFileSync(fullPath, file.buffer);
    out.push({
      tabId: meta.tabId,
      label: meta.label || meta.tabId,
      fileUrl: `/uploads/contract-document-packages/signing/${filename}`,
      fileName: file.originalname || `${safeTab}${ext}`,
    });
  }
  return out;
}
