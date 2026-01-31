import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SubmitCallbackDto } from './dto/submit-callback.dto';
import { SubmitMeasurementDto } from './dto/submit-measurement.dto';

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitMeasurement(dto: SubmitMeasurementDto) {
    return this.prisma.formSubmission.create({
      data: {
        type: 'measurement',
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        preferredDate: dto.preferredDate,
        preferredTime: dto.preferredTime,
        productType: dto.productType,
        comment: dto.comments,
      },
    });
  }

  async submitCallback(dto: SubmitCallbackDto) {
    return this.prisma.formSubmission.create({
      data: {
        type: 'callback',
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        preferredTime: dto.preferredTime,
        comment: dto.comment,
      },
    });
  }
}
