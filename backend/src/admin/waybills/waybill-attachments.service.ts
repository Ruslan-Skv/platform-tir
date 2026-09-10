import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../database/prisma.service';

/** Поля вложения, возвращаемые в API заданий путевого листа. */
export const WAYBILL_ATTACHMENT_SELECT = {
  id: true,
  fileName: true,
  fileUrl: true,
  fileSize: true,
  mimeType: true,
  createdAt: true,
  uploadedBy: {
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  },
} as const;

@Injectable()
export class WaybillAttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Прикрепляет загруженные файлы к заданию путевого листа. */
  async addAttachments(taskId: string, files: Express.Multer.File[], uploadedById: string) {
    const task = await this.prisma.waybillTask.findUnique({
      where: { id: taskId },
      select: { id: true, deletedAt: true },
    });
    if (!task || task.deletedAt) {
      throw new NotFoundException(`Waybill task ${taskId} not found`);
    }
    return this.prisma.$transaction(
      files.map((file) =>
        this.prisma.waybillTaskAttachment.create({
          data: {
            waybillTaskId: task.id,
            fileName: path.basename(file.originalname),
            fileUrl: `/uploads/waybills/${file.filename}`,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedById,
          },
          select: WAYBILL_ATTACHMENT_SELECT,
        }),
      ),
    );
  }

  /** Удаляет вложение (запись и файл на диске). */
  async removeAttachment(attachmentId: string) {
    const attachment = await this.prisma.waybillTaskAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new NotFoundException(`Вложение ${attachmentId} not found`);
    }
    await this.prisma.waybillTaskAttachment.delete({ where: { id: attachmentId } });
    const filePath = path.join(process.cwd(), attachment.fileUrl.replace(/^[/\\]+/, ''));
    fs.promises.unlink(filePath).catch(() => {
      // файла может уже не быть — это не ошибка
    });
    return { ok: true };
  }
}
