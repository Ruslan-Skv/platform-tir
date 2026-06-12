import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { UserCabinetController } from './user-cabinet.controller';
import { UserCabinetPublicController } from './user-cabinet-public.controller';
import { UserCabinetService } from './user-cabinet.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UserCabinetController, UserCabinetPublicController],
  providers: [UserCabinetService],
  exports: [UserCabinetService],
})
export class UserCabinetModule {}
