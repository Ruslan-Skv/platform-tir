import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SaveSettlementsDto } from './dto/save-settlements.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../../common/types/request-with-user.types';

@Controller('admin/catalog/suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

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

  @Get('settlement-totals')
  getSettlementTotals() {
    return this.suppliersService.getSettlementTotals();
  }

  @Get(':id/settlements')
  getSettlements(@Param('id') id: string) {
    return this.suppliersService.getSettlements(id);
  }

  @Put(':id/settlements')
  saveSettlements(
    @Param('id') id: string,
    @Body() dto: SaveSettlementsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.suppliersService.saveSettlements(id, dto.rows, req.user?.id);
  }

  @Get(':id/settlements/history')
  getSettlementHistory(@Param('id') id: string) {
    return this.suppliersService.getSettlementHistory(id);
  }

  @Post(':id/settlements/rollback/:historyId')
  rollbackSettlement(
    @Param('id') id: string,
    @Param('historyId') historyId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.suppliersService.rollbackSettlement(id, historyId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<CreateSupplierDto>) {
    return this.suppliersService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
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
