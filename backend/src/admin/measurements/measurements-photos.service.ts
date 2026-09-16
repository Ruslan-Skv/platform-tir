import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { MEASUREMENT_RELATIONS_INCLUDE, formatMeasurementResponse } from './measurements-shared';

/** Фото с результатами замера (кнопка-скрепка на странице замера). */
export const MEASUREMENT_PHOTOS_MAX = 5;

@Injectable()
export class MeasurementsPhotosService {
  constructor(private prisma: PrismaService) {}

  /** Дописывает URL загруженного фото замера (с лимитом) и возвращает обновлённый список. */
  async appendPhotoUrl(id: string, imageUrl: string, changedById?: string) {
    const current = await this.prisma.measurement.findUnique({
      where: { id },
      select: { photoUrls: true },
    });
    if (!current) {
      throw new NotFoundException(`Measurement with ID ${id} not found`);
    }
    if (current.photoUrls.length >= MEASUREMENT_PHOTOS_MAX) {
      throw new BadRequestException(
        `Можно прикрепить не более ${MEASUREMENT_PHOTOS_MAX} фото замера`,
      );
    }
    const updated = await this.prisma.measurement.update({
      where: { id },
      data: { photoUrls: { push: imageUrl } },
      include: MEASUREMENT_RELATIONS_INCLUDE,
    });
    if (changedById) {
      await this.prisma.measurementHistory.create({
        data: {
          measurementId: id,
          snapshot: { photoUrls: current.photoUrls } as object,
          changedFields: ['photoUrls'],
          action: 'UPDATE',
          changedById,
        },
      });
    }
    return formatMeasurementResponse(updated).photoUrls;
  }
}
