import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { UserCabinetController } from './user-cabinet.controller';
import { UserCabinetPublicController } from './user-cabinet-public.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [UserCabinetController, UserCabinetPublicController],
})
export class UserCabinetModule {}
