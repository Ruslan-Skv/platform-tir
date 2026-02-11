import { Module } from '@nestjs/common';
import { OfficeCashController } from './office-cash.controller';
import { OfficeCashService } from './office-cash.service';

@Module({
  controllers: [OfficeCashController],
  providers: [OfficeCashService],
  exports: [OfficeCashService],
})
export class OfficeCashModule {}
