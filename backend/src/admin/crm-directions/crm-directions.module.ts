import { Module } from '@nestjs/common';
import { CrmDirectionsService } from './crm-directions.service';
import { CrmDirectionsController } from './crm-directions.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CrmDirectionsController],
  providers: [CrmDirectionsService],
  exports: [CrmDirectionsService],
})
export class CrmDirectionsModule {}
