import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateSiteDisclaimerDto } from './dto/update-site-disclaimer.dto';
import { SiteDisclaimerService } from './site-disclaimer.service';

@ApiTags('site-disclaimer')
@Controller('site-disclaimer')
export class SiteDisclaimerController {
  constructor(private readonly siteDisclaimer: SiteDisclaimerService) {}

  @Get()
  @ApiOperation({ summary: 'Правовая оговорка на сайте (публичный)' })
  getPublic() {
    return this.siteDisclaimer.getPublic();
  }
}

@ApiTags('admin/site-disclaimer')
@Controller('admin/settings/site-disclaimer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminSiteDisclaimerController {
  constructor(private readonly siteDisclaimer: SiteDisclaimerService) {}

  @Get()
  @ApiOperation({ summary: 'Правовая оговорка (админ)' })
  getAdmin() {
    return this.siteDisclaimer.getAdmin();
  }

  @Patch()
  @ApiOperation({ summary: 'Обновить правовую оговорку' })
  update(@Body() dto: UpdateSiteDisclaimerDto) {
    return this.siteDisclaimer.update(dto);
  }
}
