import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { JointObjectsController } from './joint-objects.controller';
import { JointObjectsService } from './joint-objects.service';

@Module({
  imports: [DatabaseModule],
  controllers: [JointObjectsController],
  providers: [JointObjectsService],
  exports: [JointObjectsService],
})
export class JointObjectsModule {}
