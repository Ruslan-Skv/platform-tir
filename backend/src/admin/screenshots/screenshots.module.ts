import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AdminScreenshotsController } from './screenshots.controller';
import { AdminScreenshotsService } from './screenshots.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminScreenshotsController],
  providers: [AdminScreenshotsService],
  exports: [AdminScreenshotsService],
})
export class AdminScreenshotsModule {}
