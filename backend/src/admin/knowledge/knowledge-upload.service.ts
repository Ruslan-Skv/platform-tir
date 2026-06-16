import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';

@Injectable()
export class KnowledgeUploadService {
  private saveUploadedFile(
    file: Express.Multer.File,
    baseUrl: string,
    prefix: string,
  ): { imageUrl: string } {
    if (!file?.path) {
      throw new BadRequestException('Файл не загружен');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'knowledge');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = extname(file.originalname) || '';
    const filename = `${prefix}-${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);
    fs.renameSync(file.path, destPath);
    const rel = `/uploads/knowledge/${filename}`;
    const urlPrefix = uploadsBaseUrl(baseUrl);
    return { imageUrl: `${urlPrefix}${rel}` };
  }

  uploadThumbnail(file: Express.Multer.File, baseUrl: string): { imageUrl: string } {
    return this.saveUploadedFile(file, baseUrl, 'knowledge');
  }

  uploadAttachment(
    file: Express.Multer.File,
    baseUrl: string,
  ): { fileUrl: string; fileName: string; fileSize: number; mimeType: string } {
    const result = this.saveUploadedFile(file, baseUrl, 'attachment');
    return {
      fileUrl: result.imageUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }
}
