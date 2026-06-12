import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UpdateCallbackFormBlockDto } from './dto/update-callback-form-block.dto';
import { UpdateDirectorMessageBlockDto } from './dto/update-director-message-block.dto';
import { UpdateMeasurementFormBlockDto } from './dto/update-measurement-form-block.dto';
import { UpdateQuoteFormBlockDto } from './dto/update-quote-form-block.dto';

@Injectable()
export class AdminFormsService {
  constructor(private readonly prisma: PrismaService) {}

  async findSubmissions(type: string | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where =
      type && ['measurement', 'callback', 'director', 'quote'].includes(type) ? { type } : {};

    const [data, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.formSubmission.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDirectorSettings() {
    const block = await this.prisma.directorMessageBlock.findUnique({
      where: { id: 'main' },
    });
    return {
      directorEmail: block?.directorEmail ?? null,
      telegramChatId: block?.telegramChatId ?? null,
      updatedAt: block?.updatedAt ?? null,
    };
  }

  async updateDirectorSettings(dto: UpdateDirectorMessageBlockDto) {
    const block = await this.prisma.directorMessageBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        directorEmail: dto.directorEmail?.trim() || null,
        telegramChatId: dto.telegramChatId?.trim() || null,
        updatedAt: new Date(),
      },
      update: {
        ...(dto.directorEmail !== undefined && {
          directorEmail: dto.directorEmail?.trim() || null,
        }),
        ...(dto.telegramChatId !== undefined && {
          telegramChatId: dto.telegramChatId?.trim() || null,
        }),
        updatedAt: new Date(),
      },
    });
    return {
      directorEmail: block.directorEmail,
      telegramChatId: block.telegramChatId,
      updatedAt: block.updatedAt,
    };
  }

  async getMeasurementFormSettings() {
    const block = await this.prisma.measurementFormBlock.findUnique({
      where: { id: 'main' },
    });
    return {
      recipientEmail: block?.recipientEmail ?? null,
      telegramChatId: block?.telegramChatId ?? null,
      updatedAt: block?.updatedAt ?? null,
    };
  }

  async updateMeasurementFormSettings(dto: UpdateMeasurementFormBlockDto) {
    const block = await this.prisma.measurementFormBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        recipientEmail: dto.recipientEmail?.trim() || null,
        telegramChatId: dto.telegramChatId?.trim() || null,
        updatedAt: new Date(),
      },
      update: {
        ...(dto.recipientEmail !== undefined && {
          recipientEmail: dto.recipientEmail?.trim() || null,
        }),
        ...(dto.telegramChatId !== undefined && {
          telegramChatId: dto.telegramChatId?.trim() || null,
        }),
        updatedAt: new Date(),
      },
    });
    return {
      recipientEmail: block.recipientEmail,
      telegramChatId: block.telegramChatId,
      updatedAt: block.updatedAt,
    };
  }

  async getCallbackFormSettings() {
    const block = await this.prisma.callbackFormBlock.findUnique({
      where: { id: 'main' },
    });
    return {
      recipientEmail: block?.recipientEmail ?? null,
      telegramChatId: block?.telegramChatId ?? null,
      updatedAt: block?.updatedAt ?? null,
    };
  }

  async updateCallbackFormSettings(dto: UpdateCallbackFormBlockDto) {
    const block = await this.prisma.callbackFormBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        recipientEmail: dto.recipientEmail?.trim() || null,
        telegramChatId: dto.telegramChatId?.trim() || null,
        updatedAt: new Date(),
      },
      update: {
        ...(dto.recipientEmail !== undefined && {
          recipientEmail: dto.recipientEmail?.trim() || null,
        }),
        ...(dto.telegramChatId !== undefined && {
          telegramChatId: dto.telegramChatId?.trim() || null,
        }),
        updatedAt: new Date(),
      },
    });
    return {
      recipientEmail: block.recipientEmail,
      telegramChatId: block.telegramChatId,
      updatedAt: block.updatedAt,
    };
  }

  async getQuoteFormSettings() {
    const block = await this.prisma.quoteFormBlock.findUnique({
      where: { id: 'main' },
    });
    const opts = block?.serviceTypeOptions;
    const options = Array.isArray(opts) ? opts : [];
    return {
      recipientEmail: block?.recipientEmail ?? null,
      telegramChatId: block?.telegramChatId ?? null,
      serviceTypeOptions: options,
      updatedAt: block?.updatedAt ?? null,
    };
  }

  async updateQuoteFormSettings(dto: UpdateQuoteFormBlockDto) {
    const serviceTypeOptionsValue: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined =
      dto.serviceTypeOptions === undefined
        ? undefined
        : dto.serviceTypeOptions === null
          ? Prisma.JsonNull
          : (dto.serviceTypeOptions as Prisma.InputJsonValue);

    const block = await this.prisma.quoteFormBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        recipientEmail: dto.recipientEmail?.trim() || null,
        telegramChatId: dto.telegramChatId?.trim() || null,
        serviceTypeOptions: dto.serviceTypeOptions ?? undefined,
        updatedAt: new Date(),
      },
      update: {
        ...(dto.recipientEmail !== undefined && {
          recipientEmail: dto.recipientEmail?.trim() || null,
        }),
        ...(dto.telegramChatId !== undefined && {
          telegramChatId: dto.telegramChatId?.trim() || null,
        }),
        ...(serviceTypeOptionsValue !== undefined && {
          serviceTypeOptions: serviceTypeOptionsValue,
        }),
        updatedAt: new Date(),
      },
    });
    const opts = block.serviceTypeOptions;
    const options = Array.isArray(opts) ? opts : [];
    return {
      recipientEmail: block.recipientEmail,
      telegramChatId: block.telegramChatId,
      serviceTypeOptions: options,
      updatedAt: block.updatedAt,
    };
  }
}
