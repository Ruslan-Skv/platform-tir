import { BadRequestException } from '@nestjs/common';

const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF = Buffer.from('%PDF');

function startsWithBuffer(data: Buffer, signature: Buffer): boolean {
  if (data.length < signature.length) return false;
  return data.subarray(0, signature.length).equals(signature);
}

/** Проверка magic bytes для загружаемых изображений (JPEG/PNG). */
export function assertImageUploadMagicBytes(buffer: Buffer, originalname: string): void {
  if (!buffer?.length) {
    throw new BadRequestException('Пустой файл');
  }
  const isJpeg = startsWithBuffer(buffer, JPEG);
  const isPng = startsWithBuffer(buffer, PNG);
  if (!isJpeg && !isPng) {
    throw new BadRequestException(`Недопустимое содержимое файла: ${originalname}`);
  }
}

/** Проверка magic bytes для PDF. */
export function assertPdfUploadMagicBytes(buffer: Buffer, originalname: string): void {
  if (!buffer?.length) {
    throw new BadRequestException('Пустой файл');
  }
  if (!startsWithBuffer(buffer, PDF)) {
    throw new BadRequestException(`Недопустимое содержимое PDF: ${originalname}`);
  }
}
