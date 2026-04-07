import { Module } from '@nestjs/common';
import { CoatingMaterialsService } from './coating-materials.service';
import { CoatingMaterialsController } from './coating-materials.controller';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CoatingMaterialsController],
  providers: [CoatingMaterialsService],
  exports: [CoatingMaterialsService],
})
export class CoatingMaterialsModule {}
