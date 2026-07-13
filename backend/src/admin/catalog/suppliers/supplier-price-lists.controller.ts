import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as os from 'os';
import * as path from 'path';
import { SupplierPriceListsService } from './supplier-price-lists.service';
import type { SupplierPriceListCategory } from './parsers/price-list-parser.types';
import { SUPPLIER_PRICE_LIST_CATEGORIES } from './parsers/price-list-parser.types';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../../common/types/request-with-user.types';

@Controller('admin/catalog/suppliers/:supplierId/price-lists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
export class SupplierPriceListsController {
  constructor(private readonly service: SupplierPriceListsService) {}

  private parseCategory(value?: string): SupplierPriceListCategory {
    if (value && SUPPLIER_PRICE_LIST_CATEGORIES.includes(value as SupplierPriceListCategory)) {
      return value as SupplierPriceListCategory;
    }
    return 'TRIM';
  }

  @Post('upload-all')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (_req, file, cb) => {
          cb(null, `price-list-${Date.now()}${path.extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadAll(
    @Param('supplierId') supplierId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return this.service.uploadAllSnapshots(supplierId, file, req.user?.id);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (_req, file, cb) => {
          cb(null, `price-list-${Date.now()}${path.extname(file.originalname)}`);
        },
      }),
    }),
  )
  upload(
    @Param('supplierId') supplierId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.service.uploadSnapshot(
      supplierId,
      file,
      this.parseCategory(category),
      req.user?.id,
    );
  }

  @Get()
  list(@Param('supplierId') supplierId: string, @Query('category') category?: string) {
    return this.service.listSnapshots(
      supplierId,
      category ? this.parseCategory(category) : undefined,
    );
  }

  @Get('mappings')
  listMappings(@Param('supplierId') supplierId: string) {
    return this.service.listMappings(supplierId);
  }

  @Get('compare')
  compare(
    @Param('supplierId') supplierId: string,
    @Query('currentId') currentId: string,
    @Query('previousId') previousId?: string,
    @Query('category') category?: string,
  ) {
    if (!currentId) {
      throw new BadRequestException('Укажите currentId — снимок нового прайса');
    }
    return this.service.compareSnapshots(
      supplierId,
      currentId,
      previousId,
      category ? this.parseCategory(category) : undefined,
    );
  }

  @Get(':snapshotId')
  getOne(@Param('supplierId') supplierId: string, @Param('snapshotId') snapshotId: string) {
    return this.service.getSnapshot(supplierId, snapshotId);
  }

  @Post('auto-map')
  autoMap(
    @Param('supplierId') supplierId: string,
    @Body() body: { snapshotId?: string; category?: SupplierPriceListCategory },
  ) {
    return this.service.autoMapRows(
      supplierId,
      body.snapshotId,
      body.category ? this.parseCategory(body.category) : 'TRIM',
    );
  }

  @Post('mappings')
  saveMapping(
    @Param('supplierId') supplierId: string,
    @Body() body: { rowKey: string; catalogItemId: string },
  ) {
    if (!body.rowKey || !body.catalogItemId) {
      throw new BadRequestException('Укажите rowKey и catalogItemId');
    }
    return this.service.saveMapping(supplierId, body.rowKey, body.catalogItemId);
  }

  @Post('apply')
  apply(
    @Param('supplierId') supplierId: string,
    @Body()
    body: {
      currentSnapshotId: string;
      previousSnapshotId?: string;
      rowKeys?: string[];
      category?: SupplierPriceListCategory;
    },
  ) {
    if (!body.currentSnapshotId) {
      throw new BadRequestException('Укажите currentSnapshotId');
    }
    return this.service.applyPriceChanges(
      supplierId,
      body.currentSnapshotId,
      body.previousSnapshotId,
      body.rowKeys,
      body.category ? this.parseCategory(body.category) : undefined,
    );
  }
}
