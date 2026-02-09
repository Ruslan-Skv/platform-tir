import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ContactFormService } from './contact-form.service';
import { UpdateContactFormBlockDto } from './dto/update-contact-form-block.dto';

@ApiTags('home-contact-form')
@Controller('home/contact-form')
export class ContactFormController {
  constructor(private readonly contactFormService: ContactFormService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные блока «Контактная форма» (публичный)' })
  getBlock() {
    return this.contactFormService.getBlock();
  }
}

@ApiTags('admin/home-contact-form')
@Controller('admin/home/contact-form')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminContactFormController {
  constructor(private readonly contactFormService: ContactFormService) {}

  @Get()
  @ApiOperation({ summary: 'Получить данные блока (админ)' })
  getBlock() {
    return this.contactFormService.getBlock();
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить блок «Контактная форма»' })
  updateBlock(@Body() dto: UpdateContactFormBlockDto) {
    return this.contactFormService.updateBlock(dto);
  }
}
