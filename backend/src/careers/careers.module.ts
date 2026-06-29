import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CareersAdminController, CareersPublicController } from './careers.controller';
import { CareersService } from './careers.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CareersPublicController, CareersAdminController],
  providers: [CareersService],
  exports: [CareersService],
})
export class CareersModule {}
