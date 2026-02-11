import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CreateContractAdvanceDto } from './dto/create-contract-advance.dto';
import { CreateContractAmendmentDto } from './dto/create-contract-amendment.dto';
import { UpdateContractAmendmentDto } from './dto/update-contract-amendment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/types/request-with-user.types';

const actsDir = path.join(process.cwd(), 'uploads', 'contracts', 'acts');

const CRM_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
] as const;

@Controller('admin/contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CRM_ROLES)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  create(@Body() createContractDto: CreateContractDto) {
    return this.contractsService.create(createContractDto);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('managerId') managerId?: string,
    @Query('directionId') directionId?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contractsService.findAll({
      status,
      managerId,
      directionId,
      search,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('customers')
  getCustomersFromContracts(@Query('search') search?: string) {
    return this.contractsService.getCustomersFromContracts(search ?? undefined);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.contractsService.getHistory(id);
  }

  @Post(':id/rollback/:historyId')
  rollback(
    @Param('id') id: string,
    @Param('historyId') historyId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.contractsService.rollback(id, historyId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
    @Req() req: RequestWithUser,
  ) {
    return this.contractsService.update(id, updateContractDto, req.user?.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contractsService.remove(id);
  }

  @Post(':id/upload-act-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(actsDir)) fs.mkdirSync(actsDir, { recursive: true });
          cb(null, actsDir);
        },
        filename: (_req, file, cb) => {
          cb(null, `act-${Date.now()}${extname(file.originalname) || '.jpg'}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpe?g|png|webp|gif)$/i.test(file.originalname);
        if (!allowed) {
          cb(new BadRequestException('Допустимы только изображения: jpg, png, webp, gif'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadActImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
  ) {
    if (type !== 'start' && type !== 'end') {
      throw new BadRequestException('Параметр type должен быть start или end');
    }
    return this.contractsService.uploadActImage(id, file, type);
  }

  @Post(':id/advances')
  addAdvance(@Param('id') id: string, @Body() dto: CreateContractAdvanceDto) {
    return this.contractsService.addAdvance(id, dto);
  }

  @Post(':id/amendments')
  addAmendment(@Param('id') id: string, @Body() dto: CreateContractAmendmentDto) {
    return this.contractsService.addAmendment(id, dto);
  }

  @Delete(':id/advances/:advanceId')
  removeAdvance(@Param('id') id: string, @Param('advanceId') advanceId: string) {
    return this.contractsService.removeAdvance(id, advanceId);
  }

  @Patch(':id/amendments/:amendmentId')
  @Roles('SUPER_ADMIN')
  updateAmendment(
    @Param('id') id: string,
    @Param('amendmentId') amendmentId: string,
    @Body() dto: UpdateContractAmendmentDto,
  ) {
    return this.contractsService.updateAmendment(id, amendmentId, dto);
  }

  @Delete(':id/amendments/:amendmentId')
  @Roles('SUPER_ADMIN')
  removeAmendment(@Param('id') id: string, @Param('amendmentId') amendmentId: string) {
    return this.contractsService.removeAmendment(id, amendmentId);
  }
}
