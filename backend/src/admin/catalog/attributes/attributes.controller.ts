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
import { AttributesService } from './attributes.service';
import { CreateAttributeDto, AttributeValueDto } from './dto/create-attribute.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/catalog/attributes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Post()
  create(@Body() createAttributeDto: CreateAttributeDto) {
    return this.attributesService.create(createAttributeDto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('isFilterable') isFilterable?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.attributesService.findAll({
      search,
      type,
      isFilterable: isFilterable ? isFilterable === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attributesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<CreateAttributeDto>) {
    return this.attributesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attributesService.remove(id);
  }

  // Attribute Values
  @Post(':id/values')
  addValue(@Param('id') id: string, @Body() valueDto: AttributeValueDto) {
    return this.attributesService.addValue(id, valueDto);
  }

  @Patch('values/:valueId')
  updateValue(@Param('valueId') valueId: string, @Body() valueDto: Partial<AttributeValueDto>) {
    return this.attributesService.updateValue(valueId, valueDto);
  }

  @Delete('values/:valueId')
  removeValue(@Param('valueId') valueId: string) {
    return this.attributesService.removeValue(valueId);
  }

  @Post(':id/values/reorder')
  reorderValues(@Param('id') id: string, @Body() items: { id: string; order: number }[]) {
    return this.attributesService.reorderValues(id, items);
  }
}
