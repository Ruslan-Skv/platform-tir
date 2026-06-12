import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AdminFormsController } from './admin-forms.controller';
import { AdminFormsService } from './admin-forms.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminFormsController],
  providers: [AdminFormsService],
  exports: [AdminFormsService],
})
export class AdminFormsModule {}
