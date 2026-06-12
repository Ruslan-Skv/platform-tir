import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserCabinetService } from './user-cabinet.service';

@ApiTags('user-cabinet')
@Controller('user-cabinet')
export class UserCabinetPublicController {
  constructor(private readonly userCabinet: UserCabinetService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Настройки личного кабинета (публичный)' })
  getSettings() {
    return this.userCabinet.getPublicSettings();
  }
}
