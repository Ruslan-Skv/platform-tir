import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompareService } from './compare.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../common/types/request-with-user.types';

@ApiTags('compare')
@Controller('compare')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CompareController {
  constructor(private readonly compareService: CompareService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список товаров для сравнения' })
  getCompare(@Request() req: RequestWithUser) {
    return this.compareService.getCompare(req.user.id);
  }

  @Get('count')
  @ApiOperation({ summary: 'Получить количество товаров в сравнении' })
  getCompareCount(@Request() req: RequestWithUser) {
    return this.compareService.getCompareCount(req.user.id);
  }

  @Get('items')
  @ApiOperation({ summary: 'Получить список элементов сравнения с метаданными' })
  getCompareItems(@Request() req: RequestWithUser) {
    return this.compareService.getCompareItems(req.user.id);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Добавить товар в сравнение' })
  addToCompare(@Request() req: RequestWithUser, @Param('productId') productId: string) {
    return this.compareService.addToCompare(req.user.id, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Удалить товар из сравнения' })
  removeFromCompare(@Request() req: RequestWithUser, @Param('productId') productId: string) {
    return this.compareService.removeFromCompare(req.user.id, productId);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Проверить, находится ли товар в сравнении' })
  async checkInCompare(@Request() req: RequestWithUser, @Param('productId') productId: string) {
    const isInCompare = await this.compareService.isInCompare(req.user.id, productId);
    return { isInCompare };
  }
}
