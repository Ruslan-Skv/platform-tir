import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';
import { UpdateCallbackFormBlockDto } from './dto/update-callback-form-block.dto';
import { UpdateDirectorMessageBlockDto } from './dto/update-director-message-block.dto';
import { UpdateMeasurementFormBlockDto } from './dto/update-measurement-form-block.dto';

@ApiTags('admin/forms')
@Controller('admin/forms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminFormsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Список заявок с форм (замер, обратный звонок, письмо директору)' })
  async findAll(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    const where = type && ['measurement', 'callback', 'director'].includes(type) ? { type } : {};

    const [data, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.formSubmission.count({ where }),
    ]);

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  @Get('director-settings')
  @ApiOperation({ summary: 'Настройки формы «Письмо директору»' })
  async getDirectorSettings() {
    const block = await this.prisma.directorMessageBlock.findUnique({
      where: { id: 'main' },
    });
    return {
      directorEmail: block?.directorEmail ?? null,
      updatedAt: block?.updatedAt ?? null,
    };
  }

  @Patch('director-settings')
  @ApiOperation({ summary: 'Обновить настройки формы «Письмо директору»' })
  async updateDirectorSettings(@Body() dto: UpdateDirectorMessageBlockDto) {
    const block = await this.prisma.directorMessageBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        directorEmail: dto.directorEmail?.trim() || null,
        updatedAt: new Date(),
      },
      update: {
        directorEmail: dto.directorEmail?.trim() || null,
        updatedAt: new Date(),
      },
    });
    return {
      directorEmail: block.directorEmail,
      updatedAt: block.updatedAt,
    };
  }

  @Get('measurement-form-settings')
  @ApiOperation({ summary: 'Настройки формы «Записаться на замер»' })
  async getMeasurementFormSettings() {
    const block = await this.prisma.measurementFormBlock.findUnique({
      where: { id: 'main' },
    });
    return {
      recipientEmail: block?.recipientEmail ?? null,
      updatedAt: block?.updatedAt ?? null,
    };
  }

  @Patch('measurement-form-settings')
  @ApiOperation({ summary: 'Обновить настройки формы «Записаться на замер»' })
  async updateMeasurementFormSettings(@Body() dto: UpdateMeasurementFormBlockDto) {
    const block = await this.prisma.measurementFormBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        recipientEmail: dto.recipientEmail?.trim() || null,
        updatedAt: new Date(),
      },
      update: {
        recipientEmail: dto.recipientEmail?.trim() || null,
        updatedAt: new Date(),
      },
    });
    return {
      recipientEmail: block.recipientEmail,
      updatedAt: block.updatedAt,
    };
  }

  @Get('callback-form-settings')
  @ApiOperation({ summary: 'Настройки формы «Заказать звонок»' })
  async getCallbackFormSettings() {
    const block = await this.prisma.callbackFormBlock.findUnique({
      where: { id: 'main' },
    });
    return {
      recipientEmail: block?.recipientEmail ?? null,
      updatedAt: block?.updatedAt ?? null,
    };
  }

  @Patch('callback-form-settings')
  @ApiOperation({ summary: 'Обновить настройки формы «Заказать звонок»' })
  async updateCallbackFormSettings(@Body() dto: UpdateCallbackFormBlockDto) {
    const block = await this.prisma.callbackFormBlock.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        recipientEmail: dto.recipientEmail?.trim() || null,
        updatedAt: new Date(),
      },
      update: {
        recipientEmail: dto.recipientEmail?.trim() || null,
        updatedAt: new Date(),
      },
    });
    return {
      recipientEmail: block.recipientEmail,
      updatedAt: block.updatedAt,
    };
  }
}
