import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { InstallersController } from './installers.controller';
import { InstallersService } from './installers.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InstallersController],
  providers: [InstallersService],
  exports: [InstallersService],
})
export class InstallersModule {}
