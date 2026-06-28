import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeStringArray, parseStringArray } from '../../external-notify/external-notify.util';
import { UpdateCallbackFormBlockDto } from './dto/update-callback-form-block.dto';
import { UpdateDirectorMessageBlockDto } from './dto/update-director-message-block.dto';
import { UpdateMeasurementFormBlockDto } from './dto/update-measurement-form-block.dto';
import { UpdateQuoteFormBlockDto } from './dto/update-quote-form-block.dto';

function mapNotifyChannels(block: {
  notifyEmails: Prisma.JsonValue | null;
  notifyTelegramIds: Prisma.JsonValue | null;
  notifyMaxIds: Prisma.JsonValue | null;
  updatedAt: Date;
}) {
  return {
    notifyEmails: parseStringArray(block.notifyEmails),
    notifyTelegramIds: parseStringArray(block.notifyTelegramIds),
    notifyMaxIds: parseStringArray(block.notifyMaxIds),
    updatedAt: block.updatedAt,
  };
}

function buildNotifyChannelsUpdate(dto: {
  notifyEmails?: string[];
  notifyTelegramIds?: string[];
  notifyMaxIds?: string[];
}): {
  notifyEmails?: string[];
  notifyTelegramIds?: string[];
  notifyMaxIds?: string[];
} {
  const data: {
    notifyEmails?: string[];
    notifyTelegramIds?: string[];
    notifyMaxIds?: string[];
  } = {};
  if (dto.notifyEmails !== undefined) {
    data.notifyEmails = normalizeStringArray(dto.notifyEmails);
  }
  if (dto.notifyTelegramIds !== undefined) {
    data.notifyTelegramIds = normalizeStringArray(dto.notifyTelegramIds);
  }
  if (dto.notifyMaxIds !== undefined) {
    data.notifyMaxIds = normalizeStringArray(dto.notifyMaxIds);
  }
  return data;
}

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
    if (!block) {
      return {
        notifyEmails: [],
        notifyTelegramIds: [],
        notifyMaxIds: [],
        updatedAt: null,
      };
    }
    return mapNotifyChannels(block);
  }

  async updateDirectorSettings(dto: UpdateDirectorMessageBlockDto) {
    const notifyData = buildNotifyChannelsUpdate(dto);
    const block = await this.prisma.directorMessageBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        ...notifyData,
        updatedAt: new Date(),
      },
      update: {
        ...notifyData,
        updatedAt: new Date(),
      },
    });
    return mapNotifyChannels(block);
  }

  async getMeasurementFormSettings() {
    const block = await this.prisma.measurementFormBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return {
        notifyEmails: [],
        notifyTelegramIds: [],
        notifyMaxIds: [],
        updatedAt: null,
      };
    }
    return mapNotifyChannels(block);
  }

  async updateMeasurementFormSettings(dto: UpdateMeasurementFormBlockDto) {
    const notifyData = buildNotifyChannelsUpdate(dto);
    const block = await this.prisma.measurementFormBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        ...notifyData,
        updatedAt: new Date(),
      },
      update: {
        ...notifyData,
        updatedAt: new Date(),
      },
    });
    return mapNotifyChannels(block);
  }

  async getCallbackFormSettings() {
    const block = await this.prisma.callbackFormBlock.findUnique({
      where: { id: 'main' },
    });
    if (!block) {
      return {
        notifyEmails: [],
        notifyTelegramIds: [],
        notifyMaxIds: [],
        updatedAt: null,
      };
    }
    return mapNotifyChannels(block);
  }

  async updateCallbackFormSettings(dto: UpdateCallbackFormBlockDto) {
    const notifyData = buildNotifyChannelsUpdate(dto);
    const block = await this.prisma.callbackFormBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        ...notifyData,
        updatedAt: new Date(),
      },
      update: {
        ...notifyData,
        updatedAt: new Date(),
      },
    });
    return mapNotifyChannels(block);
  }

  async getQuoteFormSettings() {
    const block = await this.prisma.quoteFormBlock.findUnique({
      where: { id: 'main' },
    });
    const opts = block?.serviceTypeOptions;
    const options = Array.isArray(opts) ? opts : [];
    if (!block) {
      return {
        notifyEmails: [],
        notifyTelegramIds: [],
        notifyMaxIds: [],
        serviceTypeOptions: options,
        updatedAt: null,
      };
    }
    return {
      ...mapNotifyChannels(block),
      serviceTypeOptions: options,
    };
  }

  async updateQuoteFormSettings(dto: UpdateQuoteFormBlockDto) {
    const notifyData = buildNotifyChannelsUpdate(dto);
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
        ...notifyData,
        serviceTypeOptions: dto.serviceTypeOptions ?? undefined,
        updatedAt: new Date(),
      },
      update: {
        ...notifyData,
        ...(serviceTypeOptionsValue !== undefined && {
          serviceTypeOptions: serviceTypeOptionsValue,
        }),
        updatedAt: new Date(),
      },
    });
    const opts = block.serviceTypeOptions;
    const options = Array.isArray(opts) ? opts : [];
    return {
      ...mapNotifyChannels(block),
      serviceTypeOptions: options,
    };
  }
}
