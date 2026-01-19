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
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

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
