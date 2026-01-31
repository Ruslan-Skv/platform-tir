import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AdminFormsController } from './admin-forms.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminFormsController],
})
export class AdminFormsModule {}
