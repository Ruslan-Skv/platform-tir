import { Body, Controller, Get, NotFoundException, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateSellerLegalDto } from './dto/update-seller-legal.dto';
import { SellerLegalService } from './seller-legal.service';

@ApiTags('seller-legal')
@Controller('seller-legal')
export class SellerLegalController {
  constructor(private readonly sellerLegal: SellerLegalService) {}

  @Get()
  @ApiOperation({ summary: 'Информация о продавце (публичная)' })
  async getPublic() {
    const data = await this.sellerLegal.getPublic();
    if (!data) {
      throw new NotFoundException('Информация о продавце не опубликована');
    }
    return data;
  }
}

@ApiTags('admin/seller-legal')
@Controller('admin/settings/seller-legal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminSellerLegalController {
  constructor(private readonly sellerLegal: SellerLegalService) {}

  @Get()
  @ApiOperation({ summary: 'Информация о продавце (админ)' })
  getAdmin() {
    return this.sellerLegal.getAdmin();
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить информацию о продавце' })
  update(@Body() dto: UpdateSellerLegalDto) {
    return this.sellerLegal.update(dto);
  }
}
