import { Module } from '@nestjs/common';
import { ComplexObjectsService } from './complex-objects.service';
import { ComplexObjectsController } from './complex-objects.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ComplexObjectsController],
  providers: [ComplexObjectsService],
  exports: [ComplexObjectsService],
})
export class ComplexObjectsModule {}
