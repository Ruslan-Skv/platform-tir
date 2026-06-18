import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { uploadsBaseUrl } from '../../common/utils/uploads-url';

const resumesDir = path.join(process.cwd(), 'uploads', 'recruitment');

@Injectable()
export class RecruitmentUploadService {
  ensureDir() {
    if (!fs.existsSync(resumesDir)) {
      fs.mkdirSync(resumesDir, { recursive: true });
    }
  }

  uploadResume(file: Express.Multer.File, baseUrl: string) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    const finalName = `resume-${Date.now()}${path.extname(file.originalname) || '.pdf'}`;
    const finalPath = path.join(resumesDir, finalName);
    fs.renameSync(file.path, finalPath);

    const publicBase = uploadsBaseUrl(baseUrl);
    return {
      fileUrl: `${publicBase}/uploads/recruitment/${finalName}`,
      fileName: file.originalname,
      filePath: finalPath,
      mimeType: file.mimetype,
    };
  }
}
