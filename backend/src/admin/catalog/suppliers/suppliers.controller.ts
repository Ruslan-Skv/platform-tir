import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

/** Каталожные API поставщиков: справочник для товаров (селекты, привязка товаров,
 *  синхронизация, прайс-листы). Реквизиты и ведомость расчётов живут в разделе
 *  «Поставщики» (admin/suppliers) — см. backend/src/admin/suppliers. */
@Controller('admin/catalog/suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('syncEnabled') syncEnabled?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.suppliersService.findAll({
      search,
      isActive: isActive ? isActive === 'true' : undefined,
      syncEnabled: syncEnabled ? syncEnabled === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  // Sync
  @Post(':id/sync')
  startSync(@Param('id') id: string) {
    return this.suppliersService.startSync(id);
  }

  @Get(':id/sync-logs')
  getSyncLogs(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.suppliersService.getSyncLogs(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // Product mapping
  @Get(':id/products')
  getSupplierProducts(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.suppliersService.getSupplierProducts(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post(':id/products/:productId')
  mapProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body()
    data: {
      supplierSku: string;
      supplierPrice: number;
      supplierStock?: number;
      isMainSupplier?: boolean;
    },
  ) {
    return this.suppliersService.mapProduct(id, productId, data);
  }

  @Delete(':id/products/:productId')
  unmapProduct(@Param('id') id: string, @Param('productId') productId: string) {
    return this.suppliersService.unmapProduct(id, productId);
  }
}
