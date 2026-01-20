import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminProductsService } from './admin-products.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/catalog/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('manufacturerId') manufacturerId?: string,
    @Query('isActive') isActive?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('lowStock') lowStock?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminProductsService.findAll({
      search,
      categoryId,
      manufacturerId,
      isActive: isActive ? isActive === 'true' : undefined,
      isFeatured: isFeatured ? isFeatured === 'true' : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      lowStock: lowStock === 'true',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy,
      sortOrder,
    });
  }

  @Get('stats')
  getStats() {
    return this.adminProductsService.getStats();
  }

  @Get('export')
  exportProducts(
    @Query('categoryId') categoryId?: string,
    @Query('manufacturerId') manufacturerId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminProductsService.exportProducts({
      categoryId,
      manufacturerId,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminProductsService.findOne(id);
  }

  // Bulk operations
  @Post('bulk/update')
  bulkUpdate(
    @Body()
    body: {
      ids: string[];
      data: {
        price?: number;
        comparePrice?: number;
        stock?: number;
        isActive?: boolean;
        isFeatured?: boolean;
        categoryId?: string;
      };
    },
  ) {
    return this.adminProductsService.bulkUpdate(body);
  }

  @Post('bulk/delete')
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.adminProductsService.bulkDelete(body.ids);
  }

  @Post('bulk/activate')
  bulkActivate(@Body() body: { ids: string[]; isActive: boolean }) {
    return this.adminProductsService.bulkActivate(body.ids, body.isActive);
  }

  @Post('bulk/prices')
  bulkUpdatePrices(
    @Body() body: { updates: { id: string; price?: number; comparePrice?: number }[] },
  ) {
    return this.adminProductsService.bulkUpdatePrices(body.updates);
  }

  @Post('bulk/stock')
  bulkUpdateStock(@Body() body: { updates: { id: string; stock: number }[] }) {
    return this.adminProductsService.bulkUpdateStock(body.updates);
  }

  @Post('import')
  importProducts(
    @Body()
    body: {
      products: {
        name: string;
        slug: string;
        sku?: string;
        price: number;
        comparePrice?: number;
        stock?: number;
        categoryId: string;
        manufacturerId?: string;
        description?: string;
        images?: string[];
        isActive?: boolean;
      }[];
    },
  ) {
    return this.adminProductsService.importProducts(body.products);
  }

  @Post('import/file')
  @UseInterceptors(FileInterceptor('file'))
  async importFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('categoryId') categoryId: string,
    @Body('skuPrefix') skuPrefix?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    if (!categoryId) {
      throw new BadRequestException('Не указана категория');
    }

    return this.adminProductsService.importFromFile(
      file.buffer,
      file.originalname,
      categoryId,
      skuPrefix,
    );
  }

  @Get('import/preview')
  async getImportPreview(@Query('path') filePath: string) {
    return this.adminProductsService.previewImportFile(filePath);
  }

  // Reviews
  @Get(':id/reviews')
  getReviews(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminProductsService.getReviews(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Patch('reviews/:reviewId/approve')
  approveReview(@Param('reviewId') reviewId: string) {
    return this.adminProductsService.approveReview(reviewId);
  }

  @Delete('reviews/:reviewId')
  deleteReview(@Param('reviewId') reviewId: string) {
    return this.adminProductsService.deleteReview(reviewId);
  }
}
